import Head from "next/head";
import { ChatSidebar } from "../../components/ChatSidebar/ChatSidebar";
import { useEffect, useState } from "react";
import { streamReader } from "openai-edge-stream";
import { v4 as uuid } from "uuid";
import { Message } from "../../components/Message";
import { useRouter } from "next/router";
import { getSession } from "@auth0/nextjs-auth0";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

export default function ChatPage({chatId, title, messages = []}) {
  const [newChatId, setNewChatId] = useState(null)
  const [incomingMessage, setIncomingMessage] = useState("");
  const [messageText, setMessageText] = useState("");
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [fullMessage, setFullMessage] = useState("")
  const router = useRouter()

  // when our route changes
  useEffect(() => {
    setNewChatMessages([])
    setNewChatId(null)
  }, [chatId])

  // save the newly steam messages to new chat messages
  useEffect(() => {
    if(!generatingResponse && fullMessage) {
      setNewChatMessages( prev => [...prev, {
        _id: uuid(),
        role: "assistant",
        content: fullMessage
      }])
      setFullMessage("")
    }
  }, [generatingResponse, fullMessage])

  // if we created a new chat
  useEffect(() => {
    if(!generatingResponse && newChatId) {
      setNewChatId(null)
      router.push(`/chat/${newChatId}`)
    }
  }, [newChatId, generatingResponse, router])
  const handleSubmit = async (e) => {
    setGeneratingResponse(true)
    e.preventDefault();
    setNewChatMessages(prev => ( [...prev, {
      _id: uuid(),
      role: "user",
      content: messageText,
    }]))
    setMessageText('')
    const response = await fetch("/api/chat/sendMessage", {
      method: "POST",
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        message: messageText,
        chatId
      }),
    })
    const data = response.body
    if (!data) {
      return;
    }

    const reader = data.getReader();
    let content = ""
    await streamReader(reader, (message) => {
      if(message.event == 'newChatId') {
        setNewChatId(message.content)
      } else {
        setIncomingMessage(s => `${s}${message.content}`)
        content += message.content
      }
    });
    setFullMessage(content)
    setIncomingMessage("")
    setGeneratingResponse(false)
  };

  const allMessages = [...messages, ...newChatMessages]
  return (
    <>
      <Head>
        <title>New Chat</title>
      </Head>
      <div className="grid h-screen grid-cols-[260px_1fr]">
        <ChatSidebar chatId={chatId}/>
        <div className="bg-gray-700 flex flex-col overflow-hidden">
          <div className="flex-1 text-white overflow-auto">
            {allMessages.map(message => <Message
              key={message._id}
              role={message.role}
              content={message.content}
            />)}
            { !!incomingMessage && <Message
              role="assistant"
              content={incomingMessage}
            />}
          </div>
          <footer className="bg-gray-800 p-10">
            <form onSubmit={handleSubmit}>
              <fieldset className="flex gap-2" disabled={generatingResponse}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full resize-none rounded-md bg-gray-700 p-2 text-white focus:border-emerald-500 focus:bg-gray-600 focus:outline focus:outline-emerald-500" placeholder={generatingResponse ? '' : 'Send a message...'}></textarea>
                <button className="btn" type="submit">Send</button>
              </fieldset>
            </form>
          </footer>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = async (ctx) => {
  const chatId = ctx.params?.chatId?.[0] || null;
  console.log("chatid in gssp", chatId)
  if (chatId) {
    const { user } = await getSession(ctx.req, ctx.res)
    console.log("user in gssp", user)

    const client = await clientPromise;
    const db = client.db("ChattyPete")
    const chat = await db.collection("chats").findOne({
      _id: new ObjectId(chatId),
      userId: user.sub
    })
    console.log("found chat", chat)
    return {
      props: {
        chatId,
        title: chat.title,
        messages: chat.messages.map( message => ({
          ...message,
          _id: uuid()
        }))
      }
    }
  }
  return {
    props: {
    }
  }
}
