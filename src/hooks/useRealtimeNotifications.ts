// src/hooks/useRealtimeNotifications.ts
import { useState, useEffect } from 'react';
import { auth } from '../firebase';

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setMessages([]);
      setConnected(false);
      return;
    }

    // Since we're in a custom environment, we might need a token for the SSE connection
    // But for simplicity, we'll try standard SSE and use userId in query if needed
    // The server-side will handle session/auth checking
    const eventSource = new EventSource(`/api/notifications/stream?uid=${currentUser.uid}`);
    
    eventSource.onopen = () => {
      setConnected(true);
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'notifications') {
          // Flatten if it's an array of groups
          const newNotifs = Array.isArray(data.data) ? data.data : [data.data];
          setNotifications(prev => [...newNotifs, ...prev]);
        } else if (data.type === 'messages') {
          const newMsgs = Array.isArray(data.data) ? data.data : [data.data];
          setMessages(prev => [...newMsgs, ...prev]);
        } else if (data.type === 'connected') {
          console.log('SSE connected:', data.userId);
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setConnected(false);
      eventSource.close();
    };
    
    return () => eventSource.close();
  }, [currentUser]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return { notifications, messages, connected, markAsRead };
}
