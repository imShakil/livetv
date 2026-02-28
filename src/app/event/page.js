import EventDetailsPage from '@/components/EventDetailsPage';
import { EVENT_DETAILS_PAGE_METADATA } from '@/config/site';

export const metadata = EVENT_DETAILS_PAGE_METADATA;

export default function EventRoutePage() {
  return <EventDetailsPage />;
}
