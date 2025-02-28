import { useState, useEffect } from 'react';
import { INotification } from '@/types';
import { notifications as initialNotifications } from '@/lib/data';

export function useNotifications() {
  const [notifications, setNotifications] = useState<INotification[]>([]);

  // Initialize notifications from mock data
  useEffect(() => {
    setNotifications(initialNotifications);
  }, []);

  // Update a specific notification
  const updateNotification = (updatedNotification: INotification) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === updatedNotification.id ? updatedNotification : notification
      )
    );
  };

  // Mark a notification as read (changing status from pending to neutral)
  const markAsRead = (id: number) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === id && notification.status === 'pending' 
          ? { ...notification, status: 'neutral' } 
          : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.status === 'pending' 
          ? { ...notification, status: 'neutral' } 
          : notification
      )
    );
  };

  // Get unread count
  const unreadCount = notifications.filter(notification => 
    notification.status === 'pending'
  ).length;

  // Get important notifications count
  const importantCount = notifications.filter(notification => 
    ['pending', 'urgent'].includes(notification.status)
  ).length;

  return {
    notifications,
    updateNotification,
    markAsRead,
    markAllAsRead,
    unreadCount,
    importantCount
  };
}