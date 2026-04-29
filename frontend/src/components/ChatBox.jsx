import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

export default function ChatBox() {
  const socket = useSocket();
  const { chatMessages, addChatMessage, nickname } = useGameStore();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const onMessage = (msg) => addChatMessage(msg);
    socket.on('chat:message', onMessage);
    return () => socket.off('chat:message', onMessage);
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    socket.emit('chat:message', { text: trimmed });
    setText('');
  }

  return (
    <div className="chatbox">
      <div className="chatbox-header">Chat</div>
      <div className="chatbox-messages">
        {chatMessages.length === 0 && (
          <p className="chatbox-empty">Nadie ha escrito nada aún...</p>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className={`chatbox-msg ${msg.nickname === nickname ? 'chatbox-msg-me' : ''}`}>
            <span className="chatbox-nick">{msg.nickname}</span>
            <span className="chatbox-text">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chatbox-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={200}
          autoComplete="off"
        />
        <button type="submit" className="btn-primary chatbox-send">Enviar</button>
      </form>
    </div>
  );
}
