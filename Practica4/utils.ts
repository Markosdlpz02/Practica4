import { Collection } from "mongodb";
import { Usuario, UsuarioModel, Proyecto, ProyectoModel, Tarea, TareaModel } from "./types.ts";


export const fromModelToUsuario = (model: UsuarioModel): Usuario => ({
  id: model._id!.toString(),
  name: model.name,
  email: model.email,
  created_at: model.created_at,
});

export const fromModelToProyecto = async (proyectoDB: ProyectoModel, usuariosCollection: Collection<UsuarioModel>): Promise<Proyecto> => {
  const usuarioDB = await usuariosCollection.findOne({ _id: proyectoDB.user_id });
  if (!usuarioDB) {
    throw new Error("Usuario no encontrado");
  }

  return {
    id: proyectoDB._id!.toString(),
    name: proyectoDB.name,
    description: proyectoDB.description,
    start_date: proyectoDB.start_date,
    end_date: proyectoDB.end_date,
    user_id: proyectoDB.user_id.toString(), 
  };
};

export const fromModelToTarea = async (tareaDB: TareaModel, proyectosCollection: Collection<ProyectoModel>): Promise<Tarea> => {
  const proyectoDB = await proyectosCollection.findOne({ _id: tareaDB.project_id });
  if (!proyectoDB) {
    throw new Error("Proyecto no encontrado");
  }

  return {
    id: tareaDB._id!.toString(),
    title: tareaDB.title,
    description: tareaDB.description,
    status: tareaDB.status,
    created_at: tareaDB.created_at,
    due_date: tareaDB.due_date,
    project_id: tareaDB.project_id.toString(),
  };
};


