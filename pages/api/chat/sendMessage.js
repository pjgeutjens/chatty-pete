import { OpenAIEdgeStream } from "openai-edge-stream";

export const config = {
  runtime: "edge"
};

export default async function handler(req) {
  try {
    const { chatId: chatIdFromParam, message } = await req.json()
    let chatId = chatIdFromParam
    let newChatId
    const initialChatMessage = {
      role: "system",
      content: "Your name is Chatty Pete, a somewhat melancholy but very smart AI who always responds with very witty funny replies however showing a bit of ennui. Your responses must be formatted as markdown."
    }

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
    }

    const stream = await OpenAIEdgeStream('https://api.openai.com/v1/chat/completions', {
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      method: "POST",
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [initialChatMessage, {content: message, role: "user"}],
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