export function checkoutResultOutcome(params: {
  order?: string;
  method?: string;
  ok?: string;
  redirect_status?: string;
}): 'success' | 'failed' | 'pending' {
  if (params.ok === '0' || params.redirect_status === 'failed') return 'failed';
  if (params.ok === '1' || params.redirect_status === 'succeeded') return 'success';
  if (params.method === 'cod' && params.order) return 'success';
  if (params.order) return 'pending';
  return 'pending';
}
