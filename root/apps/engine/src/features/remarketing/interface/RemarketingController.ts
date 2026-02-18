
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RemarketingJobSchema } from '../domain/types';

// Define the bindigns relevant to this feature
type Bindings = {
    SCHEDULER_DO: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post('/schedule', zValidator('json', RemarketingJobSchema.omit({ id: true, status: true, attempts: true })), async (c) => {
    const payload = c.req.valid('json');
    const { tenantId } = payload;

    const id = c.env.SCHEDULER_DO.idFromName(tenantId);
    const stub = c.env.SCHEDULER_DO.get(id);

    // Generate a job ID here or let the DO do it. 
    // Better to generate here so we can return it.
    const jobId = crypto.randomUUID();
    const job = {
        ...payload,
        id: jobId,
        status: 'pending',
        attempts: 0,
    };

    const response = await stub.fetch('http://do/schedule', { // internal URL doesn't matter much for DOs
        method: 'POST',
        body: JSON.stringify(job),
    });

    if (!response.ok) {
        return c.json({ error: 'Failed to schedule job' }, 500);
    }

    const result = await response.json();
    return c.json(result);
});

export default app;
