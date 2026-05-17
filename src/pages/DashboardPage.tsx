import React, { useState, useEffect } from 'react';
import { Title, Grid, Paper, Text, TextInput, Button, Group, Stack, Badge, List, SimpleGrid } from '@mantine/core';
import { IconSearch, IconCar, IconUser, IconTool, IconClipboardList } from '@tabler/icons-react';
import { api } from '../services/api.ts';
import { Car, Client, Repair, Employee } from '../types.ts';

export default function DashboardPage() {
  const [searchPlate, setSearchPlate] = useState('');
  const [ownerInfo, setOwnerInfo] = useState<Client | null>(null);
  
  const [searchOwnerName, setSearchOwnerName] = useState('');
  const [ownerCars, setOwnerCars] = useState<Car[]>([]);
  const [ownerFaults, setOwnerFaults] = useState<string[]>([]);

  const [stats, setStats] = useState({
    clients: 0,
    cars: 0,
    employees: 0,
    activeRepairs: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      const clients = await api.getClients();
      const cars = await api.getCars();
      const employees = await api.getEmployees();
      const repairs = await api.getRepairs();
      
      setStats({
        clients: clients.length,
        cars: cars.length,
        employees: employees.filter(e => e.isActive).length,
        activeRepairs: repairs.filter(r => !r.isArchived).length
      });
    };
    fetchData();
  }, []);

  const handleSearchByPlate = async () => {
    const cars = await api.getCars();
    const car = cars.find(c => c.licensePlate === searchPlate);
    if (car) {
      const clients = await api.getClients();
      const owner = clients.find(cl => cl.id === car.ownerId);
      setOwnerInfo(owner || null);
    } else {
      setOwnerInfo(null);
    }
  };

  const handleSearchByOwner = async () => {
    const clients = await api.getClients();
    const owner = clients.find(cl => cl.fullName.toLowerCase().includes(searchOwnerName.toLowerCase()));
    if (owner) {
      const cars = (await api.getCars()).filter(c => c.ownerId === owner.id);
      setOwnerCars(cars);
      
      const allRepairs = (await api.getRepairs()).filter(r => r.clientId === owner.id && r.isArchived);
      const faults = allRepairs.flatMap(r => r.faults.map(f => f.description));
      setOwnerFaults(faults);
    } else {
      setOwnerCars([]);
      setOwnerFaults([]);
    }
  };

  const [specificFault, setSpecificFault] = useState('');
  const [faultResults, setFaultResults] = useState<{worker: string, time: number}[]>([]);
  
  const [faultType, setFaultType] = useState('');
  const [clientsWithFault, setClientsWithFault] = useState<string[]>([]);

  const [targetMake, setTargetMake] = useState('');
  const [commonFault, setCommonFault] = useState('');

  const handleFaultSearch = async () => {
    const allRepairs = (await api.getRepairs()).filter(r => r.isArchived);
    const results: {worker: string, time: number}[] = [];
    const empMap = new Map((await api.getEmployees()).map(e => [e.id, e.fullName]));
    
    allRepairs.forEach(r => {
      r.faults.forEach(f => {
        if (f.description.toLowerCase().includes(specificFault.toLowerCase())) {
          results.push({
            worker: empMap.get(f.assignedWorkerId || '') || 'Неизвестно',
            time: f.timeHours
          });
        }
      });
    });
    setFaultResults(results);
  };

  const handleClientsByFaultType = async () => {
    const allRepairs = (await api.getRepairs()).filter(r => r.isArchived);
    const clientIds = new Set<string>();
    allRepairs.forEach(r => {
      if (r.faults.some(f => f.type.toLowerCase() === faultType.toLowerCase() || f.description.toLowerCase().includes(faultType.toLowerCase()))) {
        clientIds.add(r.clientId);
      }
    });
    const clients = await api.getClients();
    setClientsWithFault(clients.filter(c => clientIds.has(c.id)).map(c => c.fullName));
  };

  const handleMostCommonFault = async () => {
    const allRepairs = (await api.getRepairs()).filter(r => r.isArchived);
    const cars = (await api.getCars()).filter(c => c.make.toLowerCase() === targetMake.toLowerCase());
    const carIds = new Set(cars.map(c => c.id));
    
    const faultCounts: Record<string, number> = {};
    allRepairs.forEach(r => {
      if (carIds.has(r.carId)) {
        r.faults.forEach(f => {
          faultCounts[f.description] = (faultCounts[f.description] || 0) + 1;
        });
      }
    });
    
    const winner = Object.entries(faultCounts).sort((a, b) => b[1] - a[1])[0];
    setCommonFault(winner ? `${winner[0]} (встречалась ${winner[1]} раз)` : 'Нет данных');
  };

  return (
    <Stack gap="xl">
      <Title order={1}>Информационная панель</Title>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Клиенты</Text>
            <IconUser size="1.4rem" stroke={1.5} />
          </Group>
          <Text size="xl" fw={700}>{stats.clients}</Text>
        </Paper>
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Автомобили</Text>
            <IconCar size="1.4rem" stroke={1.5} />
          </Group>
          <Text size="xl" fw={700}>{stats.cars}</Text>
        </Paper>
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Сотрудники</Text>
            <IconTool size="1.4rem" stroke={1.5} />
          </Group>
          <Text size="xl" fw={700}>{stats.employees}</Text>
        </Paper>
        <Paper p="md" withBorder radius="md">
          <Group justify="space-between">
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">В ремонте</Text>
            <IconClipboardList size="1.4rem" stroke={1.5} />
          </Group>
          <Text size="xl" fw={700}>{stats.activeRepairs}</Text>
        </Paper>
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder>
            <Title order={3} mb="md">Поиск владельца по госномеру</Title>
            <Group align="flex-end">
              <TextInput 
                label="Госномер" 
                placeholder="A123BC77" 
                style={{ flex: 1 }}
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.currentTarget.value)}
              />
              <Button onClick={handleSearchByPlate} leftSection={<IconSearch size={16} />}>Найти</Button>
            </Group>
            {ownerInfo ? (
              <Stack mt="md" gap="xs">
                <Text fw={500}>Владелец: {ownerInfo.fullName}</Text>
                <Text size="sm">Прописка: {ownerInfo.registrationAddress}</Text>
              </Stack>
            ) : searchPlate && <Text size="sm" c="red" mt="md">Владелец не найден</Text>}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" withBorder>
            <Title order={3} mb="md">Инфо по владельцу</Title>
            <Group align="flex-end">
              <TextInput 
                label="ФИО владельца" 
                placeholder="Иванов И.И." 
                style={{ flex: 1 }}
                value={searchOwnerName}
                onChange={(e) => setSearchOwnerName(e.currentTarget.value)}
              />
              <Button onClick={handleSearchByOwner} leftSection={<IconSearch size={16} />}>Поиск</Button>
            </Group>
            {ownerCars.length > 0 && (
              <Stack mt="md" gap="xs">
                <Text fw={500}>Автомобили:</Text>
                {ownerCars.map(car => (
                  <Badge key={car.id} variant="light" size="lg">
                    {car.make} {car.model} ({car.year})
                  </Badge>
                ))}
                <Text fw={500} mt="xs">Устраненные неисправности:</Text>
                <List size="sm">
                  {ownerFaults.length > 0 ? ownerFaults.map((f, i) => <List.Item key={i}>{f}</List.Item>) : <Text size="sm" c="dimmed">Нет данных</Text>}
                </List>
              </Stack>
            )}
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" withBorder>
            <Title order={3} mb="md">Поиск по неисправности</Title>
            <Group align="flex-end">
              <TextInput 
                label="Неисправность" 
                placeholder="Замена масла" 
                style={{ flex: 1 }}
                value={specificFault}
                onChange={(e) => setSpecificFault(e.currentTarget.value)}
              />
              <Button onClick={handleFaultSearch}><IconSearch size={16} /></Button>
            </Group>
            <Stack mt="md" gap="xs">
              {faultResults.map((res, i) => (
                <Text key={i} size="sm">Мастер: <b>{res.worker}</b>, Время: {res.time} ч.</Text>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" withBorder>
            <Title order={3} mb="md">Клиенты по типу неисправности</Title>
            <Group align="flex-end">
              <TextInput 
                label="Тип/название" 
                placeholder="Двигатель" 
                style={{ flex: 1 }}
                value={faultType}
                onChange={(e) => setFaultType(e.currentTarget.value)}
              />
              <Button onClick={handleClientsByFaultType}><IconSearch size={16} /></Button>
            </Group>
            <Stack mt="md" gap="xs">
              {clientsWithFault.map((name, i) => <Text key={i} size="sm">{name}</Text>)}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper p="md" withBorder>
            <Title order={3} mb="md">Популярная неисправность марки</Title>
            <Group align="flex-end">
              <TextInput 
                label="Марка авто" 
                placeholder="Toyota" 
                style={{ flex: 1 }}
                value={targetMake}
                onChange={(e) => setTargetMake(e.currentTarget.value)}
              />
              <Button onClick={handleMostCommonFault}><IconSearch size={16} /></Button>
            </Group>
            {commonFault && <Text size="sm" mt="md" fw={500}>{commonFault}</Text>}
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
