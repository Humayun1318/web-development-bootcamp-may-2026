import { NextFunction, Request, Response } from 'express';
import { ZodObject } from 'zod';
import { ParsedQs } from 'qs';

export const validateQuery =
    (schema: ZodObject<any>) =>
        async (req: Request, _res: Response, next: NextFunction) => {
            try {
                req.query = await schema.parseAsync(req.query) as unknown as ParsedQs;
                next();
            } catch (error) {
                next(error);
            }
        };