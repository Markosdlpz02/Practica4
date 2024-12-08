import { ObjectId, OptionalId } from "mongodb";

export type UsuarioModel = OptionalId<{
  name: string;
  email: string;
  created_at: Date;
}>;

export type Usuario = {
  id: string;
  name: string;
  email: string;
  created_at: Date;
};

export type ProyectoModel = OptionalId<{
  name: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  user_id: ObjectId; 
}>;

export type Proyecto = {
  id: string;
  name: string;
  description?: string;
  start_date: Date;
  end_date?: Date;
  user_id: string; 
};

export type TareaModel = OptionalId<{
  title: string;
  description?: string;
  status: string; 
  created_at: Date;
  due_date?: Date;
  project_id: ObjectId; 
}>;

export type Tarea = {
  id: string;
  title: string;
  description?: string;
  status: string; 
  created_at: Date;
  due_date?: Date;
  project_id: string; 
};