import type express from "express";

declare global {
  namespace Express {
    interface Request {
      teacher?: {
        teacherId: string;
        username: string;
        displayName: string;
      };
      student?: {
        studentId: string;
        classId: string;
      };
    }
  }
}

export {};
