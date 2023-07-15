import { OpenAIEdgeStream } from "openai-edge-stream";

export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  try {
    const { chatId: chatIdFromParam, message } = await req.json()
    let chatId = chatIdFromParam
    // TODO: system message from env?
    const initialChatMessage = {
      role: "system",
      content: "Your name is Chatty Pete, a somewhat melancholy but very smart AI who always responds with very witty funny replies however showing a bit of ennui. Your responses must be formatted as markdown."
    }

    let newChatId
    let chatMessages = [];

    if (chatId) {
      const response = await fetch(`${req.headers.get('origin')}/api/chat/addMessageToChat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: req.headers.get('cookie')
        },
        body: JSON.stringify({
          chatId,
          role: "user",
          content: message
        })
      });
      const json = await response.json();
      chatMessages = json.chat.messages || []
    //   TODO: make json return consistent between createNewChat and addMessageToChat
    } else {
      const response = await fetch(`${req.headers.get('origin')}/api/chat/createNewChat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: req.headers.get('cookie')
        },
        body: JSON.stringify({
          message: message
        })
      });

      const json = await response.json();
      chatId = json._id
      newChatId = json._id
      chatMessages = json.messages || []
    }

    const messagesToInclude = []
    chatMessages.reverse();
    let usedTokens = 0
    for(let chatMessage of chatMessages) {
      const messageTokens = chatMessage.content.length / 4
      usedTokens += messageTokens
      // TODO: Can we get the limits from openai
      // TODO: refactor magic constants
      if (usedTokens <= 2000) {
        messagesToInclude.push(chatMessage)
      } else {
        break
      }
    }

    messagesToInclude.reverse()

    const stream = await OpenAIEdgeStream('https://api.openai.com/v1/chat/completions', {
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      method: "POST",
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [initialChatMessage, ...messagesToInclude],
        stream: true
      })
    }, {
      onBeforeStream :async ({ emit }) => {
        if(newChatId) {
          emit(newChatId, "newChatId");
        }
      },
      onAfterStream: async ({ fullContent}) => {
        await fetch(`${req.headers.get('origin')}/api/chat/addMessageToChat`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: req.headers.get('cookie')
          },
          body: JSON.stringify({
            chatId,
            role: "assistant",
            content: fullContent,
          })

        })
      }
    });
    return new Response(stream)
  } catch (e) {
    console.log("An error occurred in send-message", e);
  }
}