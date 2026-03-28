import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>SafeTrust</h1>
      <p>
        Open the apartment detail placeholder at{' '}
        <Link href="/hotel/1">/hotel/1</Link>.
      </p>
    </main>
  );
}
