import { NextFunction, Request, Response } from 'express';
import { ZodObject } from 'zod';
import { ParamsDictionary } from 'express-serve-static-core';
export const validateParams =
    (schema: ZodObject<any>) =>
        async (req: Request, _res: Response, next: NextFunction) => {
            try {
                const parsedParams = await schema.parseAsync(req.params);
                req.params = parsedParams as unknown as ParamsDictionary;

                next();
            } catch (error) {
                next(error);
            }
        };