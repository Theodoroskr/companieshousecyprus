CREATE TABLE public.order_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  content_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX order_documents_item_idx ON public.order_documents (order_item_id, created_at);
CREATE INDEX order_documents_order_idx ON public.order_documents (order_id);

GRANT SELECT ON public.order_documents TO authenticated;
GRANT ALL ON public.order_documents TO service_role;

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order documents"
ON public.order_documents
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_documents.order_id
    AND (o.user_id = auth.uid() OR o.email = auth.email())
));

CREATE POLICY "Admins can view all order documents"
ON public.order_documents
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));