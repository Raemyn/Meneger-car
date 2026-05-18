import React, { useEffect, useState } from 'react';
import {
  Title,
  Table,
  Button,
  Group,
  Modal,
  TextInput,
  Stack,
  Select,
  NumberInput,
  Text,
  Badge,
  List,
  ActionIcon,
  Card,
  Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconEdit, IconHistory, IconTool } from '@tabler/icons-react';
import dayjs from 'dayjs';

import { api } from '../services/api.ts';
import { Car, Client, Repair, Employee } from '../types.ts';

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [opened, { open, close }] = useDisclosure(false);
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);
  const [clientOpened, { open: openClient, close: closeClient }] = useDisclosure(false);

  const [editingCar, setEditingCar] = useState<Partial<Car> | null>(null);
  const [selectedCarForHistory, setSelectedCarForHistory] = useState<Car | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [carsData, clientsData, repairsData, employeesData] = await Promise.all([
        api.getCars(),
        api.getClients(),
        api.getRepairs(),
        api.getEmployees(),
      ]);

      setCars(carsData);
      setClients(clientsData);
      setRepairs(repairsData);
      setEmployees(employeesData);
    };

    fetchData();
  }, []);

  const getCarBrand = (car: Car) => car.brand;
  const getCarOwnerName = (car: Car) => car.client?.fullName ?? car.ownerName ?? 'Неизвестно';

  const handleSave = async () => {
    const brand = (editingCar?.brand ?? '').trim();
    const model = (editingCar?.model ?? '').trim();
    const licensePlate = (editingCar?.licensePlate ?? '').trim();
    const ownerId = editingCar?.ownerId;

    if (!brand || !model || !licensePlate || ownerId === undefined || ownerId === null) {
      return;
    }

    const owner = clients.find((c) => c.id === Number(ownerId));

    const payload: Car = {
      id: editingCar?.id ? Number(editingCar.id) : Date.now(),
      ownerId: Number(ownerId),
      brand,
      model,
      year: editingCar?.year ?? dayjs().year(),
      color: editingCar?.color ?? null,
      licensePlate,
      ownerName: owner?.fullName ?? 'Неизвестно',
      client: owner ?? null,
    };

    if (editingCar?.id) {
      await api.updateCar(payload);
    } else {
      await api.saveCar(payload);
    }

    const freshCars = await api.getCars();
    setCars(freshCars);
    close();
    setEditingCar(null);
  };

  const getCarRepairs = (carId: number) => {
    return repairs.filter((repair) => Number(repair.carId) === Number(carId));
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>База автомобилей</Title>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => {
            setEditingCar({});
            open();
          }}
        >
          Добавить автомобиль
        </Button>
      </Group>

      <Table highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Госномер</Table.Th>
            <Table.Th>Марка / Модель</Table.Th>
            <Table.Th>Цвет</Table.Th>
            <Table.Th>Год выпуска</Table.Th>
            <Table.Th>Владелец</Table.Th>
            <Table.Th>Ремонты</Table.Th>
            <Table.Th w={100}>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {cars.map((car) => {
            const carRepairs = getCarRepairs(car.id);
            const ownerName = getCarOwnerName(car);
            const brand = getCarBrand(car);

            return (
              <Table.Tr key={car.id}>
                <Table.Td>
                  <Badge
                    size="lg"
                    variant="outline"
                    color="dark"
                    radius="sm"
                    styles={{ root: { border: '2px solid' } }}
                  >
                    {car.licensePlate || '-'}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  {brand} {car.model || ''}
                </Table.Td>

                <Table.Td>{car.color || '-'}</Table.Td>

                <Table.Td>{car.year || '-'}</Table.Td>

                <Table.Td>
                  <Text
                    c="blue"
                    fw={500}
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => {
                      const client =
                        clients.find((c) => c.id === Number(car.ownerId)) ?? car.client ?? null;

                      if (client) {
                        setSelectedClient(client);
                        openClient();
                      }
                    }}
                  >
                    {ownerName}
                  </Text>
                </Table.Td>

                <Table.Td>
                  {carRepairs.length > 0 ? (
                    <Button
                      variant="light"
                      size="xs"
                      color="blue"
                      leftSection={<IconHistory size={14} />}
                      onClick={() => {
                        setSelectedCarForHistory(car);
                        openHistory();
                      }}
                    >
                      История ({carRepairs.length})
                    </Button>
                  ) : (
                    <Text size="xs" c="dimmed">
                      Нет данных
                    </Text>
                  )}
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => {
                        setEditingCar({
                          ...car,
                          brand: getCarBrand(car),
                        });
                        open();
                      }}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          setEditingCar(null);
        }}
        title="Карточка автомобиля"
        centered
      >
        <Stack>
          <Select
            label="Владелец"
            placeholder="Выберите из базы"
            required
            searchable
            data={clients.map((c) => ({
              value: String(c.id),
              label: c.fullName,
            }))}
            value={editingCar?.ownerId ? String(editingCar.ownerId) : null}
            onChange={(val) =>
              setEditingCar((prev) => ({
                ...(prev ?? {}),
                ownerId: val ? Number(val) : undefined,
              }))
            }
          />

          <Group grow>
            <TextInput
              label="Марка"
              placeholder="Toyota"
              required
              value={editingCar?.brand ?? ''}
              onChange={(e) =>
                setEditingCar((prev) => ({
                  ...(prev ?? {}),
                  brand: e.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Модель"
              placeholder="Camry"
              required
              value={editingCar?.model ?? ''}
              onChange={(e) =>
                setEditingCar((prev) => ({
                  ...(prev ?? {}),
                  model: e.currentTarget.value,
                }))
              }
            />
          </Group>

          <Group grow>
            <TextInput
              label="Госномер"
              placeholder="A001AA77"
              required
              value={editingCar?.licensePlate ?? ''}
              onChange={(e) =>
                setEditingCar((prev) => ({
                  ...(prev ?? {}),
                  licensePlate: e.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Цвет"
              placeholder="Белый"
              value={editingCar?.color ?? ''}
              onChange={(e) =>
                setEditingCar((prev) => ({
                  ...(prev ?? {}),
                  color: e.currentTarget.value,
                }))
              }
            />
          </Group>

          <NumberInput
            label="Год выпуска"
            value={editingCar?.year ?? dayjs().year()}
            onChange={(val) =>
              setEditingCar((prev) => ({
                ...(prev ?? {}),
                year: typeof val === 'number' ? val : Number(val) || dayjs().year(),
              }))
            }
          />

          <Button onClick={handleSave} mt="md">
            Сохранить
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={clientOpened}
        onClose={() => {
          closeClient();
          setSelectedClient(null);
        }}
        title="Детальная информация о клиенте"
        size="lg"
        centered
      >
        {selectedClient && (
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={0}>
                <Title order={3}>{selectedClient.fullName}</Title>
                <Text size="sm" c="dimmed">
                  {dayjs(selectedClient.birthDate).format('DD.MM.YYYY')} г.р.
                </Text>
              </Stack>
            </Group>

            <Card withBorder radius="md" p="md">
              <Text fw={700} size="sm" mb="xs" c="indigo">
                Паспортные данные и прописка
              </Text>
              <Stack gap="xs">
                <Text size="xs" c="dimmed">
                  Документ:
                </Text>
                <Text size="sm" mb="xs">
                  {selectedClient.passportData}
                </Text>
                <Text size="xs" c="dimmed">
                  Адрес регистрации (прописка):
                </Text>
                <Text size="sm">{selectedClient.registrationAddress}</Text>
              </Stack>
            </Card>

            <Button
              fullWidth
              onClick={() => {
                closeClient();
                setSelectedClient(null);
              }}
              mt="sm"
            >
              Закрыть
            </Button>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={historyOpened}
        onClose={() => {
          closeHistory();
          setSelectedCarForHistory(null);
        }}
        title={`История ремонтов: ${selectedCarForHistory
            ? `${getCarBrand(selectedCarForHistory)} ${selectedCarForHistory.model || ''} (${selectedCarForHistory.licensePlate || '-'
            })`
            : ''
          }`}
        size="xl"
      >
        <Stack gap="md" py="xs">
          {selectedCarForHistory &&
            (repairs.filter((r) => Number(r.carId) === Number(selectedCarForHistory.id)).length >
              0 ? (
              repairs
                .filter((r) => Number(r.carId) === Number(selectedCarForHistory.id))
                .sort((a, b) => dayjs(b.expectedReturnDate).unix() - dayjs(a.expectedReturnDate).unix())
                .map((repair) => (
                  <Card key={repair.id} withBorder p="md" radius="sm" shadow="xs">
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Badge size="sm" color={repair.isArchived ? 'green' : 'blue'} variant="light">
                          {repair.isArchived ? 'Архив' : 'В работе'}
                        </Badge>
                        <Text fw={700} size="sm" c="blue">
                          №{repair.id}
                        </Text>
                        <Text fw={500} size="sm">
                          {dayjs(repair.expectedReturnDate).format('DD.MM.YYYY')}
                        </Text>
                      </Group>

                      <Text size="xs" c="dimmed">
                        Мастер:{' '}
                        {repair.masterId
                          ? employees.find((e) => e.id === repair.masterId)?.fullName || 'Не найден'
                          : 'Не назначен'}
                      </Text>
                    </Group>

                    <Divider my="xs" />

                    <List size="sm" spacing="xs" icon={<IconTool size={14} color="gray" />} mt="sm">
                      {repair.faults.map((fault, index) => (
                        <List.Item key={index}>
                          <Text size="sm" fw={500}>
                            {fault.category}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {fault.description}
                          </Text>
                        </List.Item>
                      ))}
                    </List>
                  </Card>
                ))
            ) : (
              <Stack align="center" py="xl" gap="xs">
                <IconHistory size={48} color="gray" style={{ opacity: 0.3 }} />
                <Text c="dimmed">История ремонтов пуста</Text>
              </Stack>
            ))}
        </Stack>
      </Modal>
    </Stack>
  );
}