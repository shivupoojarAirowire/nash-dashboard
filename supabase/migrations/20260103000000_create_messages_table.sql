-- Create messages table for internal chat or alter if exists
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns if they don't exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Add constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_message_type_check'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
    CHECK (message_type IN ('text', 'image', 'pdf', 'file'));
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, read) WHERE read = false;

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Updated at trigger
CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Comment
COMMENT ON TABLE public.messages IS 'Internal messaging between users';

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat files
CREATE POLICY "Users can upload chat files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their chat files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete their chat files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
