
import { Response } from 'express';

interface TResponse<T> {
    // HTTP status code (200, 201, 400, 401, 404, 500, etc.)
    statusCode: number;
    success: boolean;
    message: string;
    // The actual data returned to the client (could be null for errors)
    data: T;
}


export const sendResponse = <T>(res: Response, data: TResponse<T>) => {
    // Send JSON response with consistent structure
    res.status(data.statusCode).json({
        statusCode: data.statusCode,
        success: data.success,
        message: data.message,
        data: data.data,
    });
};