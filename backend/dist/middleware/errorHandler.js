import { ZodError } from "zod";
export class AppError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}
export const notFound = (req, _res, next) => {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
export const errorHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
        return res.status(400).json({ message: "Validation failed", details: err.flatten() });
    }
    const status = err.statusCode ?? 500;
    res.status(status).json({ message: err.message ?? "Internal server error" });
};
