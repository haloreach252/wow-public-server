import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/test/$id')({
    server: {
        handlers: {
            GET: async ({ params }) => new Response(`OK ${params.id}`)
        }
    }
})