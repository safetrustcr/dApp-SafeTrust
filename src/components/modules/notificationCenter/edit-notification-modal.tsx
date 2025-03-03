import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INotification } from "@/types";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: INotification | null;
  onSave: (updatedNotification: INotification) => void;
}

export function EditNotificationModal({ 
  isOpen, 
  onClose, 
  notification, 
  onSave 
}: EditNotificationModalProps) {
  const [editedNotification, setEditedNotification] = useState<INotification | null>(notification);

  // Update local state when the notification prop changes or when modal opens
  useEffect(() => {
    if (isOpen && notification) {
      setEditedNotification(notification);
    }
  }, [isOpen, notification]);

  if (!notification) return null;

  const handleChange = (field: keyof INotification, value: any) => {
    if (editedNotification) {
      setEditedNotification({
        ...editedNotification,
        [field]: value
      });
    }
  };

  const handleSave = () => {
    if (editedNotification) {
      onSave(editedNotification);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Notification</DialogTitle>
          <DialogDescription>
            Make changes to your notification here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="title" className="text-right font-medium">
              Title
            </label>
            <Input
              id="title"
              value={editedNotification?.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="message" className="text-right font-medium">
              Message
            </label>
            <Textarea
              id="message"
              value={editedNotification?.message || ''}
              onChange={(e) => handleChange('message', e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="status" className="text-right font-medium">
              Status
            </label>
            <Select 
              value={editedNotification?.status} 
              onValueChange={(value: "success" | "pending" | "urgent" | "neutral") => handleChange('status', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}