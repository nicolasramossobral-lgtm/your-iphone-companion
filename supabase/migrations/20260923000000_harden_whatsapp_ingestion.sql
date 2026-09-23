create unique index if not exists whatsapp_messages_external_message_id_uidx
  on public.whatsapp_messages (external_message_id)
  where external_message_id is not null;

create unique index if not exists supplier_prices_source_variant_uidx
  on public.supplier_prices (source_message_id, product_variant_id)
  where source_message_id is not null;

create index if not exists whatsapp_messages_received_at_idx
  on public.whatsapp_messages (received_at desc);

create index if not exists whatsapp_messages_chat_id_idx
  on public.whatsapp_messages (chat_id);
