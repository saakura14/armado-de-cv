-- Instant delivery is off (no receipt-reading key): e-books unlock when the admin approves the payment.
update public.products set notes = array_replace(notes, 'Lo descargás desde "Mi cuenta" apenas subís el comprobante de pago.', 'Lo descargás desde "Mi cuenta" apenas confirmo tu pago.');
update public.products set notes = array_replace(notes, 'Los descargás desde "Mi cuenta" apenas subís el comprobante de pago.', 'Los descargás desde "Mi cuenta" apenas confirmo tu pago.');
update public.faqs set answer = 'Son archivos PDF que podés leer desde el celular, la tablet o la computadora. Los descargás desde "Mi cuenta" apenas se confirma tu pago.'
 where answer = 'Son archivos PDF que podés leer desde el celular, la tablet o la computadora. Apenas subís el comprobante de la transferencia en tu pedido, los descargás desde "Mi cuenta".';
