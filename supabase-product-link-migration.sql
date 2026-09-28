-- A dedicated "product link" button on a profile, separate from the generic
-- Website field, so a creator can point it at something they're selling
-- (e.g. an invite-only TradingView indicator) with its own label.
alter table profiles add column if not exists product_link_url text;
alter table profiles add column if not exists product_link_label text;
