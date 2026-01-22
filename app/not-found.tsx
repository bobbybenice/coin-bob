import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-6">
            <div className="flex flex-col items-center gap-2">
                <h1 className="text-6xl font-black text-emerald-500">404</h1>
                <h2 className="text-2xl font-bold">Page Not Found</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    The page you are looking for does not exist or has been moved.
                </p>
            </div>

            <Link href="/">
                <Button variant="emerald" size="lg">
                    Return Home
                </Button>
            </Link>
        </div>
    );
}
