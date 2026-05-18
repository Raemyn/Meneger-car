import axios from 'axios';
import { Car, Client, Employee, Repair, RepairCreate } from '../types.ts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // CLIENTS
  getClients: async (): Promise<Client[]> => {
    const response = await axiosInstance.get<Client[]>('/clients');
    return response.data;
  },

  createClient: async (client: Omit<Client, 'id'>) => {
    const response = await axiosInstance.post('/clients', client);
    return response.data;
  },

  updateClient: async (client: Client) => {
    const response = await axiosInstance.post(`/clients/${client.id}`, {
      fullName: client.fullName,
      phoneNumber: client.phoneNumber,
      birthDate: client.birthDate,
      passportData: client.passportData,
      registrationAddress: client.registrationAddress,
    });
    return response.data;
  },

  deleteClient: async (id: string | number) => {
    await axiosInstance.delete(`/clients/${id}`);
  },

  // CARS
  getCars: async (): Promise<Car[]> => {
    const response = await axiosInstance.get<Car[]>('/cars');
    return response.data;
  },

  saveCar: async (car: Car) => {
    const response = await axiosInstance.post('/cars', car);
    return response.data;
  },

  updateCar: async (car: Car) => {
    const response = await axiosInstance.post(`/cars/${car.id}`, car);
    return response.data;
  },

  deleteCar: async (id: string | number) => {
    await axiosInstance.delete(`/cars/${id}`);
  },

  // EMPLOYEES
  getEmployees: async (onlyActive = false): Promise<Employee[]> => {
    const response = await axiosInstance.get<Employee[]>('/employees');
    const data = response.data;
    return onlyActive ? data.filter((e) => e.isActive) : data;
  },

  saveEmployee: async (emp: Employee) => {
    const response = await axiosInstance.post('/employees', emp);
    return response.data;
  },

  updateEmployee: async (emp: Employee) => {
    const response = await axiosInstance.post(`/employees/${emp.id}`, emp);
    return response.data;
  },

  deleteEmployee: async (id: number) => {
    const response = await axiosInstance.delete(`/employees/${id}`);
    return response.data;
  },

  // REPAIRS
  getRepairs: async (): Promise<Repair[]> => {
    const response = await axiosInstance.get<Repair[]>('/repairs');
    return response.data;
  },

  saveRepair: async (repair: RepairCreate) => {
    const response = await axiosInstance.post('/repairs', repair);
    return response.data;
  },

  updateRepair: async (id: number, repair: Partial<RepairCreate>) => {
    const response = await axiosInstance.post(`/repairs/${id}`, repair);
    return response.data;
  },

  deleteRepair: async (id: number) => {
    const response = await axiosInstance.delete(`/repairs/${id}`);
    return response.data;
  },
};