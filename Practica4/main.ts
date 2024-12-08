import { Db, MongoClient, ObjectId } from "mongodb";
import { ProyectoModel, TareaModel, UsuarioModel } from "./types.ts";
import { fromModelToProyecto, fromModelToTarea, fromModelToUsuario } from "./utils.ts";


const MONGO_URL = Deno.env.get("MONGO_URL");

if (!MONGO_URL) {
  console.error("Please provide a MONGO_URL");
  throw new Error("MONGO_URL is not set");
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.info("Connected to MongoDB");

const db = client.db("Gestion");

const UsuariosCollection = db.collection<UsuarioModel>("Usuarios");
const ProyectosCollection = db.collection<ProyectoModel>("Proyectos");
const TareasCollection = db.collection<TareaModel>("Tareas");

const handler = async (req: Request): Promise<Response> => {
  const method = req.method;
  const url = new URL(req.url);
  const path = url.pathname;

  if (method === "GET") {
    if (path === "/users") {
      const usersDB = await UsuariosCollection.find().toArray();
      const users = await Promise.all(usersDB.map((u) => fromModelToUsuario(u)));
      return new Response(JSON.stringify(users));

    } else if (path === "/projects") {
        const projectsDB = await ProyectosCollection.find().toArray();
        const projects = await Promise.all(projectsDB.map((p) => fromModelToProyecto(p,UsuariosCollection)));
        return new Response(JSON.stringify(projects));

    } else if (path === "/tasks") {
      const tasksDB = await TareasCollection.find().toArray();
      const tasks = await Promise.all(tasksDB.map((t) => fromModelToTarea(t,ProyectosCollection)));
      return new Response(JSON.stringify(tasks));
      
    } else if (path === "/tasks/by-project") {
        const projectId = url.searchParams.get("project_id");
        if (!projectId){
          return new Response("Bad request", { status: 400 });
        } 
        const proyectoDB = await ProyectosCollection.findOne({ _id: new ObjectId(projectId as string) });
          if (!proyectoDB) {
            return new Response("Proyecto no encontrado");
          }
        const tasksDB = await TareasCollection.find({ project_id: new ObjectId(projectId) }).toArray();
        const tasks = tasksDB.map((t) => ({
          id: t._id.toString(),
          title: t.title,
          description: t.description,
          status: t.status,
          created_at: t.created_at,
          due_date: t.due_date,
        }));
        return new Response(JSON.stringify(tasks));
        
    } else if (path === "/projects/by-user") {
        const userId = url.searchParams.get("user_id");
        if (!userId){
          return new Response("Bad request", { status: 400 });
        } 
        const userDB = await UsuariosCollection.findOne({ _id: new ObjectId(userId as string) });
          if (!userDB) {
            return new Response("Usuario no encontrado");
          }
        const projectsDB = await ProyectosCollection.find({ user_id: new ObjectId(userId) }).toArray();
        const projects = projectsDB.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          description: p.description,
          start_date: p.start_date,
          end_date: p.end_date,
        }));
        return new Response(JSON.stringify(projects));
    }
  } else if (method === "POST") {

      if (path === "/users") {
        const user = await req.json();
        if (!user.name || !user.email) {
          return new Response("Bad request", { status: 400 });
        }
        const userDB = await UsuariosCollection.findOne({email: user.email,});

        if (userDB){
          return new Response("El usuario ya existe", { status: 409 });
        } 
        const { insertedId } = await UsuariosCollection.insertOne({
          name: user.name,
          email: user.email,
          created_at: new Date(),
        });

        return new Response(
          JSON.stringify({
            id: insertedId,
            name: user.name,
            email: user.email,
            created_at: new Date(),
          }),
          { status: 201 }
        );

      } else if (path === "/projects") {
        const project = await req.json();
        if (!project.name || !project.description || !project.start_date || !project.user_id) {
          return new Response("Bad request", { status: 400 });
        }
        const usuarioDB = await UsuariosCollection.findOne({ _id: new ObjectId(project.user_id as string)  });
        if (!usuarioDB) {
          return new Response("No existe un usuario con ese ID");
        }

        const { insertedId } = await ProyectosCollection.insertOne({
          name: project.name,
          description: project.description,
          start_date: new Date(project.start_date),
          end_date: undefined,
          user_id: new ObjectId(project.user_id as string),
        });
        return new Response(
          JSON.stringify({
            id: insertedId,
            name: project.name,
            description: project.description,
            start_date: new Date(project.start_date),
            end_date: null,
            user_id: project.user_id,
          }),
          { status: 201 }
        );
      
      } else if (path === "/tasks") {
          const task = await req.json();
          if (!task.title || !task.description || !task.status || !task.due_date || !task.project_id) {
            return new Response("Bad request", { status: 400 });
          }
          const proyectoDB = await ProyectosCollection.findOne({ _id: new ObjectId(task.project_id as string) });
          if (!proyectoDB) {
            return new Response("No existe un proyecto con ese ID");
          }
          const { insertedId } = await TareasCollection.insertOne({
            title: task.title,
            description: task.description,
            status: task.status,
            created_at: new Date(),
            due_date: new Date(task.due_date),
            project_id: new ObjectId(task.project_id as string),
          });
          
          return new Response(
            JSON.stringify({
              id: insertedId,
              title: task.title,
              description: task.description,
              status: task.status,
              created_at: new Date(),
              due_date: new Date(task.due_date),
              project_id: task.project_id,
            }),
            { status: 201 }
          );

      } else if (path === "/tasks/move") {
        const body = await req.json();
        if (!body.task_id || !body.destination_project_id) {
          return new Response("Bad request", { status: 400 });
        }

        const task = await TareasCollection.findOne({ _id: new ObjectId(body.task_id as string) });
        if (!task) {
          return new Response("Tarea no encontrada", { status: 404 });
        }

        const projectDest = await ProyectosCollection.findOne({ _id: new ObjectId(body.destination_project_id as string) });
        if (!projectDest) {
          return new Response("La tarea se quiere mover a un proyecto desconocido", { status: 404 });
        }
        
        const { modifiedCount } = await TareasCollection.updateOne(
          { _id: new ObjectId(body.task_id as string) },
          { $set: { project_id: new ObjectId(body.destination_project_id as string) } }
        );
      
        if (modifiedCount === 0) {
          return new Response("Error al mover tarea", { status: 500 });
        }

        const TareaActualizada = {
          id: body.task_id,
          title: task.title,
          project_id: body.destination_project_id,
        };

        return new Response(
          JSON.stringify({
            message: "Task moved successfully.",
            task:TareaActualizada,
          }),
          { status: 200 }
        );

        
      }
  } else if (method === "DELETE") {
      if (path === "/users") {
        const id = url.searchParams.get("id");
        if (!id){
          return new Response("Bad request", { status: 400 });
        }

        const { deletedCount } = await UsuariosCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (deletedCount === 0) {
          return new Response("Usuario no encontrado", { status: 404 });
        }

        return new Response(JSON.stringify({ message: "User deleted successfully." }));

      } else if (path === "/projects") {
          const id = url.searchParams.get("id");
          if (!id){
            return new Response("Bad request", { status: 400 });
          }

          const { deletedCount } = await ProyectosCollection.deleteOne({ _id: new ObjectId(id) });

          if (deletedCount === 0){
            return new Response("Proyecto no encontrado", { status: 404 });
          } 

          return new Response(JSON.stringify({ message: "Project deleted successfully." }));

      } else if (path === "/tasks") {
          const id = url.searchParams.get("id");
          if (!id){
            return new Response("Bad request", { status: 400 });
          }

          const { deletedCount } = await TareasCollection.deleteOne({ _id: new ObjectId(id) });

          if (deletedCount === 0){
            return new Response("Tarea no encontrada", { status: 404 });
          } 

          return new Response(JSON.stringify({ message: "Task deleted successfully." }));
      }
  } 

  return new Response("Endpoint not found", { status: 404 });
};

Deno.serve({ port: 8080 }, handler);
