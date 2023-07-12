import Head from "next/head";
import { ChatSidebar } from "../../components/ChatSidebar/ChatSidebar";
import { useState } from "react";
import { streamReader } from "openai-edge-stream";
import { v4 as uuid } from "uuid";
import { Message } from "../../components/Message";

export default function ChatPage() {
  const [incomingMessage, setIncomingMessage] = useState("");
  const [messageText, setMessageText] = useState("");
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
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
        message: messageText
      }),
    })
    const data = response.body
    if (!data) {
      return;
    }

    const reader = data.getReader();
    await streamReader(reader, (message) => {
      setIncomingMessage(s => `${s}${message.content}`)
    });
    setGeneratingResponse(false)
  };
  return (
    <>
      <Head>
        <title>New Chat</title>
      </Head>
      <div className="grid h-screen grid-cols-[260px_1fr]">
        <ChatSidebar />
        <div className="bg-gray-700 flex flex-col overflow-hidden">
          <div className="flex-1 text-white overflow-auto">
            {newChatMessages.map(message => <Message
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
