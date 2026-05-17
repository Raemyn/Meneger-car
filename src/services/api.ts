import axios from "axios";
import { Client, Car, Employee, Repair, FaultStatus } from "../types.ts";
import dayjs from "dayjs";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const STORAGE_KEYS = {
  CLIENTS: "sto_clients_v2",
  CARS: "sto_cars",
  EMPLOYEES: "sto_employees",
  REPAIRS: "sto_repairs_v5",
};

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "e1", fullName: "Иванов Иван Иванович", specialty: "Моторист", grade: 5, experienceYears: 10, isActive: true },
  { id: "e2", fullName: "Петров Петр Петрович", specialty: "Электрик", grade: 4, experienceYears: 7, isActive: true },
  { id: "e3", fullName: "Сидоров Сидор Сидорович", specialty: "Ходовик", grade: 6, experienceYears: 15, isActive: true },
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: "c1",
    fullName: "Сидоров Иван Петрович",
    phoneNumber: "+7 (900) 123-45-67",
    birthDate: "1985-05-15",
    passportData: "Серия 4500 №123456, выдан ОВД Пресненского р-на г. Москвы, 20.05.2005",
    registrationAddress: "г. Москва, ул. Ленина, д. 10, кв. 45",
  },
  {
    id: "c2",
    fullName: "Петров Петр Петрович",
    phoneNumber: "+7 (911) 765-43-21",
    birthDate: "1990-08-20",
    passportData: "Серия 4501 №654321, выдан ОВД Центрального р-на г. Москвы, 15.09.2010",
    registrationAddress: "г. Москва, ул. Мира, д. 5, кв. 12",
  },
];

const INITIAL_CARS: Car[] = [
  {
    id: "car1",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    color: "Черный",
    licensePlate: "A123BC77",
    ownerId: "c1",
    ownerName: "Иванов Иван Иванович",
  },
  {
    id: "car2",
    brand: "BMW",
    model: "X5",
    year: 2022,
    color: "Белый",
    licensePlate: "X555XX99",
    ownerId: "c2",
    ownerName: "Петров Петр Петрович",
  },
];

const INITIAL_REPAIRS: Repair[] = [
  ...Array.from({ length: 8 }).map((_, i) => ({
    id: `mock-r-${i}`,
    carId: "car1",
    clientId: "c1",
    dateReceived: dayjs().subtract(i * 1.5, "month").toISOString(),
    dateDeadline: dayjs().subtract(i * 1.5, "month").add(3, "day").toISOString(),
    dateFinished: dayjs().subtract(i * 1.5, "month").add(2, "day").toISOString(),
    isArchived: true,
    faults:
      i % 2 === 0
        ? [
            {
              id: `mock-f-${i}-1`,
              description: "замена моторного масла и масляного фильтра",
              type: "Техническое обслуживание (ТО)",
              costParts: 4000,
              costLabor: 1200,
              timeHours: 1,
              status: FaultStatus.RESOLVED,
              assignedWorkerId: "e1",
            },
            {
              id: `mock-f-${i}-2`,
              description: "замена воздушного фильтра",
              type: "Техническое обслуживание (ТО)",
              costParts: 800,
              costLabor: 400,
              timeHours: 0.5,
              status: FaultStatus.RESOLVED,
              assignedWorkerId: "e1",
            },
            {
              id: `mock-f-${i}-3`,
              description: "диагностика электропроводки",
              type: "Электрооборудование",
              costParts: 0,
              costLabor: 1500,
              timeHours: 1,
              status: FaultStatus.RESOLVED,
              assignedWorkerId: "e2",
            },
          ]
        : [
            {
              id: `mock-f-${i}`,
              description: i % 3 === 0 ? "замена тормозных колодок" : "замена амортизаторов",
              type: i % 3 === 0 ? "Тормозная система" : "Ходовая часть и подвеска",
              costParts: 8000,
              costLabor: 4500,
              timeHours: 4,
              status: FaultStatus.RESOLVED,
              assignedWorkerId: "e3",
            },
          ],
  })),
  {
    id: "r-active-1",
    carId: "car2",
    clientId: "c2",
    dateReceived: dayjs().subtract(1, "day").toISOString(),
    dateDeadline: dayjs().add(2, "day").toISOString(),
    isArchived: false,
    faults: [
      {
        id: "f-active-1",
        description: "замена свечей зажигания",
        type: "Техническое обслуживание (ТО)",
        costParts: 3200,
        costLabor: 1000,
        timeHours: 1,
        status: FaultStatus.RESOLVED,
        assignedWorkerId: "e1",
      },
      {
        id: "f-active-2",
        description: "диагностика двигателя (компьютерная, механическая)",
        type: "Работы с двигателем",
        costParts: 500,
        costLabor: 2500,
        timeHours: 2,
        status: FaultStatus.IN_PROGRESS,
        assignedWorkerId: "e1",
      },
    ],
  },
];

export const storage = {
  get<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },
  save<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  },
};

export const api = {
  // CLIENTS
  getClients: async (): Promise<Client[]> => {
    try {
      const response = await axiosInstance.get("/clients");
      return response.data;
    } catch (error) {
      console.warn("API error, falling back to storage:", error);
      const data = storage.get<Client>(STORAGE_KEYS.CLIENTS);
      if (data.length === 0) {
        storage.save(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
        return INITIAL_CLIENTS;
      }
      return data;
    }
  },

  createClient: async (client: Omit<Client, "id">) => {
    try {
      const response = await axiosInstance.post("/clients", client);
      return response.data;
    } catch (error) {
      console.warn("API error, saving to storage:", error);
      const clients = await api.getClients();
      const newClient: Client = {
        ...client,
        id: Math.random().toString(36).substring(2, 9),
      };
      clients.push(newClient);
      storage.save(STORAGE_KEYS.CLIENTS, clients);
      return newClient;
    }
  },

  updateClient: async (client: Client) => {
    try {
      const response = await axiosInstance.put(`/clients/${client.id}`, {
        fullName: client.fullName,
        phoneNumber: client.phoneNumber,
        birthDate: client.birthDate,
        passportData: client.passportData,
        registrationAddress: client.registrationAddress,
      });
      return response.data;
    } catch (error) {
      console.warn("API error, updating storage:", error);
      const clients = await api.getClients();
      const index = clients.findIndex((c) => String(c.id) === String(client.id));
      if (index > -1) clients[index] = client;
      storage.save(STORAGE_KEYS.CLIENTS, clients);
      return client;
    }
  },

  deleteClient: async (id: string | number) => {
    try {
      await axiosInstance.delete(`/clients/${id}`);
    } catch (error) {
      console.warn("API error, deleting from storage:", error);
      const clients = storage
        .get<Client>(STORAGE_KEYS.CLIENTS)
        .filter((c) => String(c.id) !== String(id));
      storage.save(STORAGE_KEYS.CLIENTS, clients);
    }
  },

  // CARS
  getCars: async (): Promise<Car[]> => {
    try {
      const response = await axiosInstance.get("/cars");
      return response.data;
    } catch (error) {
      console.warn("API error, falling back to storage:", error);
      const data = storage.get<Car>(STORAGE_KEYS.CARS);
      if (data.length === 0) {
        storage.save(STORAGE_KEYS.CARS, INITIAL_CARS);
        return INITIAL_CARS;
      }
      return data;
    }
  },

  saveCar: async (car: Car) => {
    try {
      await axiosInstance.post("/cars", car);
    } catch (error) {
      console.warn("API error, saving to storage:", error);
      const cars = await api.getCars();
      const index = cars.findIndex((c) => String(c.id) === String(car.id));
      if (index > -1) cars[index] = car;
      else cars.push(car);
      storage.save(STORAGE_KEYS.CARS, cars);
    }
  },

  deleteCar: async (id: string | number) => {
    try {
      await axiosInstance.delete(`/cars/${id}`);
    } catch (error) {
      console.warn("API error, deleting from storage:", error);
      const cars = storage
        .get<Car>(STORAGE_KEYS.CARS)
        .filter((c) => String(c.id) !== String(id));
      storage.save(STORAGE_KEYS.CARS, cars);
    }
  },

  // EMPLOYEES
  getEmployees: async (onlyActive = false): Promise<Employee[]> => {
    try {
      const response = await axiosInstance.get("/employees");
      const data = response.data;
      return onlyActive ? data.filter((e: Employee) => e.isActive) : data;
    } catch (error) {
      console.warn("API error, falling back to storage:", error);
      const data = storage.get<Employee>(STORAGE_KEYS.EMPLOYEES);
      if (data.length === 0) {
        const isSeeded = localStorage.getItem("sto_employees_seeded");
        if (!isSeeded) {
          storage.save(STORAGE_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
          localStorage.setItem("sto_employees_seeded", "true");
          return onlyActive ? INITIAL_EMPLOYEES.filter((e) => e.isActive) : INITIAL_EMPLOYEES;
        }
        return [];
      }
      return onlyActive ? data.filter((e) => e.isActive) : data;
    }
  },

  saveEmployee: async (emp: Employee) => {
    try {
      await axiosInstance.post("/employees", emp);
    } catch (error) {
      console.warn("API error, saving to storage:", error);
      const emps = await api.getEmployees();
      const index = emps.findIndex((e) => e.id === emp.id);
      if (index > -1) emps[index] = emp;
      else emps.push(emp);
      storage.save(STORAGE_KEYS.EMPLOYEES, emps);
    }
  },

  deleteEmployee: async (id: string | number) => {
    try {
      await axiosInstance.delete(`/employees/${id}`);
    } catch (error) {
      console.warn("API error, deleting from storage:", error);
      const emps = storage
        .get<Employee>(STORAGE_KEYS.EMPLOYEES)
        .filter((e) => String(e.id) !== String(id));
      storage.save(STORAGE_KEYS.EMPLOYEES, emps);
    }
  },

  // REPAIRS
  getRepairs: async (): Promise<Repair[]> => {
    try {
      const response = await axiosInstance.get("/repairs");
      return response.data;
    } catch (error) {
      console.warn("API error, falling back to storage:", error);
      const data = storage.get<Repair>(STORAGE_KEYS.REPAIRS);
      if (data.length === 0) {
        storage.save(STORAGE_KEYS.REPAIRS, INITIAL_REPAIRS);
        return INITIAL_REPAIRS;
      }
      return data;
    }
  },

  saveRepair: async (repair: Repair) => {
    try {
      await axiosInstance.post("/repairs", repair);
    } catch (error) {
      console.warn("API error, saving to storage:", error);
      const repairs = await api.getRepairs();
      const index = repairs.findIndex((r) => r.id === repair.id);
      if (index > -1) repairs[index] = repair;
      else repairs.push(repair);
      storage.save(STORAGE_KEYS.REPAIRS, repairs);
    }
  },
};