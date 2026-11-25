import { ZodError } from "zod";
export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ success: false, message: "Validation failed", errors: err.errors });
      }
      next(err);
    }
  };
}
