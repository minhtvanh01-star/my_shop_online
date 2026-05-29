import type { Metadata } from 'next';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order #${params.id}` };
}

export default async function OrderDetailPage({ params }: Props) {
  return (
    <div className="container py-8">
      {/* <OrderStatus /> */}
      {/* <OrderItemList /> */}
      {/* <OrderTimeline /> */}
      {/* <PaymentInfo /> */}
    </div>
  );
}
