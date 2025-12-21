'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendHorizonal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFirestore, useUser } from '@/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { ChatMessage } from '@/lib/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { data: user } = useUser();
  const firestore = useFirestore();
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!firestore || !user?.familyId) return;

    const messagesQuery = query(
      collection(firestore, 'families', user.familyId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: (data.timestamp as Timestamp)?.toDate(),
        } as ChatMessage;
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !firestore || !user?.familyId || !user)
      return;
      
    const msg: Omit<ChatMessage, 'id' | 'timestamp'> = {
      text: newMessage,
      senderId: user.uid,
      senderName: user.givenName || user.displayName?.split(' ')[0] || 'Usuario',
      senderAvatar: user.photoURL || '',
      familyId: user.familyId,
    };

    await addDoc(
      collection(firestore, 'families', user.familyId, 'messages'),
      {
        ...msg,
        timestamp: serverTimestamp(),
      }
    );
    setNewMessage('');
  };

  if (!user || !user.familyId) {
     return (
       <Card>
         <CardHeader>
           <CardTitle>Chat Familiar</CardTitle>
         </CardHeader>
         <CardContent>
           <p>Debes unirte a una familia para usar el chat.</p>
         </CardContent>
       </Card>
     );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Chat Familiar</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-end gap-3',
                message.senderId === user.uid && 'flex-row-reverse'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                <AvatarFallback>{message.senderName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'max-w-xs md:max-w-md rounded-2xl px-4 py-3',
                  message.senderId === user.uid
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-muted rounded-bl-none'
                )}
              >
                <p className="text-sm font-bold mb-1">{message.senderName}</p>
                <p>{message.text}</p>
                <p className="text-xs text-right opacity-70 mt-1">
                  {message.timestamp
                    ? new Date(message.timestamp).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardFooter className="p-4 border-t">
          <div className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Escribe un mensaje..."
              className="flex-1 text-base"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} size="icon">
              <SendHorizonal className="h-5 w-5" />
              <span className="sr-only">Enviar</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
