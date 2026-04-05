import { redirect } from 'next/navigation';

// Root route: middleware handles the redirect, but this is a safety fallback
export default function Home() {
  redirect('/dashboard');
}
