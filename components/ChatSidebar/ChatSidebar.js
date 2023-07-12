import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMessage, faPlus, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";


export const ChatSidebar = () => {
  const [chatList, setChatList] = useState([]);
  useEffect(() => {
    const loadChatList = async () => {
      const response = await fetch("/api/chat/getChatList", {
        method: "POST"
      });
      const json = await response.json()
      console.log('cjats', json)
      setChatList(json || [])
    };
    loadChatList()
  }, [])
  return <div className="bg-gray-900 text-white flex flex-col overflow-hidden">
    <a href="/chat" className="side-menu-item bg-emerald-500 hover:bg-emerald-600"><FontAwesomeIcon icon={faPlus} />New Chat</a>
    <div className="flex-1 overflow-auto bg-gray-950">
      {chatList.map(chat => (
        <Link key={chat._id} href={`/chat/${chat._id}`} className="side-menu-item"><FontAwesomeIcon icon={faMessage} />{chat.title}</Link>
      ))}
    </div>
    <a href="/api/auth/logout" className="side-menu-item"><FontAwesomeIcon icon={faRightFromBracket} />Logout</a>
  </div>
}