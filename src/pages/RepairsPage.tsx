import React, { useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconPlus, IconPrinter, IconTrash } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';

import { api } from '../services/api.ts';
import { Car, Client, Employee, Repair } from '../types.ts';

type RepairStatus = 'pending' | 'progress' | 'completed';

type RepairFault = {
  category: string;
  description: string;
};

type RepairRecord = Repair & {
  status?: RepairStatus;
  isArchived?: boolean;
  faults?: RepairFault[] | null;
  masterId?: number | null;
  laborHours?: number | null;
  laborCost?: number | null;
  partsCost?: number | null;
  expectedReturnDate?: string | null;
};

type RepairForm = {
  carId: number | null;
  clientId: number | null;
  expectedReturnDate: Date | null;
  masterId: number | null;
  laborHours: number;
  laborCost: number;
  partsCost: number;
  status: RepairStatus;
  faults: RepairFault[];
};

const emptyForm = (): RepairForm => ({
  carId: null,
  clientId: null,
  expectedReturnDate: null,
  masterId: null,
  laborHours: 0,
  laborCost: 0,
  partsCost: 0,
  status: 'pending',
  faults: [],
});

const normalizeRepair = (repair: RepairRecord): RepairRecord => ({
  ...repair,
  status: repair.status ?? 'pending',
  isArchived: repair.isArchived ?? false,
  faults: Array.isArray(repair.faults) ? repair.faults : [],
  masterId: repair.masterId ?? null,
  laborHours: Number(repair.laborHours ?? 0),
  laborCost: Number(repair.laborCost ?? 0),
  partsCost: Number(repair.partsCost ?? 0),
  expectedReturnDate: repair.expectedReturnDate ?? null,
});

const safeDate = (value?: string | null) => {
  if (!value) return '-';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD.MM.YYYY') : '-';
};

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<RepairRecord[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [opened, { open, close }] = useDisclosure(false);
  const [receiptOpened, { open: openReceipt, close: closeReceipt }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const [selectedRepair, setSelectedRepair] = useState<RepairRecord | null>(null);
  const [editingRepair, setEditingRepair] = useState<RepairRecord | null>(null);

  const [form, setForm] = useState<RepairForm>(emptyForm);
  const [faultDraft, setFaultDraft] = useState<RepairFault>({
    category: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      const [repairsData, carsData, clientsData, employeesData] = await Promise.all([
        api.getRepairs(),
        api.getCars(),
        api.getClients(),
        api.getEmployees(true),
      ]);

      const normalizedRepairs = (Array.isArray(repairsData) ? repairsData : [])
        .map((repair) => normalizeRepair(repair as RepairRecord))
        .filter((repair) => !repair.isArchived);

      setRepairs(normalizedRepairs);
      setCars(Array.isArray(carsData) ? carsData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
    } catch {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить данные',
        color: 'red',
      });

      setRepairs([]);
      setCars([]);
      setClients([]);
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setEditingRepair(null);
    setForm(emptyForm());
    setFaultDraft({
      category: '',
      description: '',
    });
  };

  const openCreateModal = () => {
    resetForm();
    open();
  };

  const openEditModal = (repair: RepairRecord) => {
    const normalized = normalizeRepair(repair);

    setEditingRepair(normalized);
    setForm({
      carId: normalized.carId ?? null,
      clientId: normalized.clientId ?? null,
      expectedReturnDate: normalized.expectedReturnDate ? new Date(normalized.expectedReturnDate) : null,
      masterId: normalized.masterId ?? null,
      laborHours: Number(normalized.laborHours ?? 0),
      laborCost: Number(normalized.laborCost ?? 0),
      partsCost: Number(normalized.partsCost ?? 0),
      status: normalized.status ?? 'pending',
      faults: Array.isArray(normalized.faults) ? normalized.faults : [],
    });
    setFaultDraft({
      category: '',
      description: '',
    });
    open();
  };

  const addFault = () => {
    const category = faultDraft.category.trim();
    const description = faultDraft.description.trim();

    if (!category || !description) {
      notifications.show({
        title: 'Ошибка',
        message: 'Заполни категорию и описание неисправности',
        color: 'red',
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      faults: [...prev.faults, { category, description }],
    }));

    setFaultDraft({
      category: '',
      description: '',
    });
  };

  const removeFault = (index: number) => {
    setForm((prev) => ({
      ...prev,
      faults: prev.faults.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    if (form.carId === null || form.clientId === null || !form.expectedReturnDate) {
      notifications.show({
        title: 'Ошибка',
        message: 'Заполни автомобиль, клиента и дату возврата',
        color: 'red',
      });
      return false;
    }

    if (form.faults.length === 0) {
      notifications.show({
        title: 'Ошибка',
        message: 'Добавь хотя бы одну неисправность',
        color: 'red',
      });
      return false;
    }

    return true;
  };

  const handleCreateRepair = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        carId: form.carId!,
        clientId: form.clientId!,
        expectedReturnDate: dayjs(form.expectedReturnDate).format('YYYY-MM-DD'),
        masterId: form.masterId ?? undefined,
        laborHours: form.laborHours,
        laborCost: form.laborCost,
        partsCost: form.partsCost,
        faults: form.faults,
        isArchived: false,
        status: form.status,
      };

      await api.saveRepair(payload as any);
      await fetchData();

      notifications.show({
        title: 'Успешно',
        message: 'Заявка на ремонт создана',
        color: 'green',
      });

      close();
      resetForm();
    } catch {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось создать заявку',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRepair = async () => {
    if (!editingRepair) return;
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        carId: form.carId!,
        clientId: form.clientId!,
        expectedReturnDate: dayjs(form.expectedReturnDate).format('YYYY-MM-DD'),
        masterId: form.masterId ?? undefined,
        laborHours: form.laborHours,
        laborCost: form.laborCost,
        partsCost: form.partsCost,
        faults: form.faults,
        isArchived: false,
        status: form.status,
      };

      await api.updateRepair(editingRepair.id, payload as any);
      await fetchData();

      notifications.show({
        title: 'Успешно',
        message: 'Заявка обновлена',
        color: 'green',
      });

      close();
      resetForm();
    } catch {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось обновить заявку',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (repair: RepairRecord, status: RepairStatus) => {
    try {
      await api.updateRepair(repair.id, { status } as any);
      await fetchData();

      notifications.show({
        title: 'Успешно',
        message: 'Статус обновлен',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось обновить статус',
        color: 'red',
      });
    }
  };

  const archiveRepair = async (repair: RepairRecord) => {
    try {
      await api.updateRepair(
        repair.id,
        {
          isArchived: true,
          status: 'completed',
        } as any
      );

      await fetchData();

      notifications.show({
        title: 'Готово',
        message: 'Заявка архивирована',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось архивировать заявку',
        color: 'red',
      });
    }
  };

  const getCarLabel = (carId: number) => {
    const car = cars.find((item) => item.id === carId);
    if (!car) return 'Автомобиль не найден';
    return `${car.licensePlate} — ${car.brand} ${car.model}`;
  };

  const getClientLabel = (clientId: number) => {
    const client = clients.find((item) => item.id === clientId);
    return client?.fullName || 'Клиент не найден';
  };

  const getEmployeeLabel = (employeeId: number | null | undefined) => {
    if (!employeeId) return 'Не выбран';
    const employee = employees.find((item) => item.id === employeeId);
    return employee ? `${employee.fullName} (${employee.specialty})` : 'Мастер не найден';
  };

  const getStatusLabel = (status?: RepairStatus) => {
    switch (status) {
      case 'progress':
        return 'В работе';
      case 'completed':
        return 'Выполнен';
      case 'pending':
      default:
        return 'Принят';
    }
  };

  const getStatusColor = (status?: RepairStatus) => {
    switch (status) {
      case 'progress':
        return 'yellow';
      case 'completed':
        return 'green';
      case 'pending':
      default:
        return 'gray';
    }
  };

  const handleCloseModal = () => {
    close();
    resetForm();
  };

  const totalRepairCost = (repair: RepairRecord) =>
    Number(repair.laborCost || 0) + Number(repair.partsCost || 0);

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Текущие ремонты</Title>
          <Text c="dimmed" size="sm">
            Оформление, редактирование и управление заявками на ремонт
          </Text>
        </div>

        <Button leftSection={<IconPlus size={18} />} onClick={openCreateModal}>
          Оформить заявку
        </Button>
      </Group>

      <Paper withBorder radius="md" p="md">
        <ScrollArea>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Автомобиль</Table.Th>
                <Table.Th>Клиент</Table.Th>
                <Table.Th>Статус</Table.Th>
                <Table.Th>Дата возврата</Table.Th>
                <Table.Th>Мастер</Table.Th>
                <Table.Th>Неисправности</Table.Th>
                <Table.Th>Действия</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {repairs.length > 0 ? (
                repairs.map((repair) => (
                  <Table.Tr key={repair.id}>
                    <Table.Td fw={500}>{getCarLabel(Number(repair.carId))}</Table.Td>
                    <Table.Td>{getClientLabel(Number(repair.clientId))}</Table.Td>

                    <Table.Td>
                      <Badge color={getStatusColor(repair.status)} variant="light">
                        {getStatusLabel(repair.status)}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Badge variant="light" color="yellow">
                        {safeDate(repair.expectedReturnDate)}
                      </Badge>
                    </Table.Td>

                    <Table.Td>{getEmployeeLabel(repair.masterId)}</Table.Td>

                    <Table.Td>
                      <Badge variant="light" color="blue">
                        {Array.isArray(repair.faults) ? repair.faults.length : 0}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Select
                          size="xs"
                          w={130}
                          value={repair.status ?? 'pending'}
                          data={[
                            { value: 'pending', label: 'Принят' },
                            { value: 'progress', label: 'В работе' },
                            { value: 'completed', label: 'Выполнен' },
                          ]}
                          onChange={(value) => {
                            if (!value) return;
                            changeStatus(repair, value as RepairStatus);
                          }}
                        />

                        <ActionIcon
                          variant="light"
                          color="orange"
                          onClick={() => openEditModal(repair)}
                          aria-label="Редактировать"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>

                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => archiveRepair(repair)}
                          aria-label="Архивировать"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>

                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => {
                            setSelectedRepair(repair);
                            openReceipt();
                          }}
                          aria-label="Печать"
                        >
                          <IconPrinter size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" c="dimmed" py="md">
                      Список ремонтов пуст
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      <Modal
        opened={opened}
        onClose={handleCloseModal}
        title={editingRepair ? 'Редактирование заявки' : 'Оформление автомобиля в ремонт'}
        size="xl"
        centered
      >
        <Stack>
          <Group grow>
            <Select
              label="Автомобиль *"
              placeholder="Выбрать"
              searchable
              data={cars.map((car) => ({
                value: String(car.id),
                label: `${car.licensePlate} — ${car.brand} ${car.model}`,
              }))}
              value={form.carId !== null ? String(form.carId) : null}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  carId: value ? Number(value) : null,
                }))
              }
            />

            <Select
              label="Клиент (кто сдает) *"
              placeholder="Выбрать"
              searchable
              data={clients.map((client) => ({
                value: String(client.id),
                label: client.fullName,
              }))}
              value={form.clientId !== null ? String(form.clientId) : null}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  clientId: value ? Number(value) : null,
                }))
              }
            />
          </Group>

          <Group grow>
            <DateInput
              label="Ожидаемая дата возврата"
              value={form.expectedReturnDate}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  expectedReturnDate: value ? new Date(value) : null,
                }))
              }
            />

            <Select
              label="Статус заявки"
              value={form.status}
              data={[
                { value: 'pending', label: 'Принят' },
                { value: 'progress', label: 'В работе' },
                { value: 'completed', label: 'Выполнен' },
              ]}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  status: (value as RepairStatus) || 'pending',
                }))
              }
            />
          </Group>

          <Paper withBorder p="md" radius="md">
            <Stack gap="md">
              <Title order={5}>Добавить неисправность</Title>

              <Group grow>
                <TextInput
                  label="Тип (Категория)"
                  placeholder="Выберите категорию"
                  value={faultDraft.category}
                  onChange={(e) =>
                    setFaultDraft({
                      category: e.currentTarget.value,
                      description: faultDraft.description,
                    })
                  }
                />
                <TextInput
                  label="Описание (уточнение) *"
                  placeholder="Замена масла или специфическое описание"
                  value={faultDraft.description}
                  onChange={(e) =>
                    setFaultDraft({
                      category: faultDraft.category,
                      description: e.currentTarget.value,
                    })
                  }
                />
              </Group>

              <Group grow align="flex-end">
                <Select
                  label="Мастер"
                  placeholder="Выбрать"
                  searchable
                  data={employees.map((employee) => ({
                    value: String(employee.id),
                    label: `${employee.fullName} (${employee.specialty})`,
                  }))}
                  value={form.masterId !== null ? String(form.masterId) : null}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      masterId: value ? Number(value) : null,
                    }))
                  }
                />

                <NumberInput
                  label="Нормо-часы"
                  min={0}
                  value={form.laborHours}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      laborHours: typeof value === 'number' ? value : Number(value) || 0,
                    }))
                  }
                />

                <NumberInput
                  label="Стоимость работ (₽)"
                  min={0}
                  value={form.laborCost}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      laborCost: typeof value === 'number' ? value : Number(value) || 0,
                    }))
                  }
                />

                <NumberInput
                  label="Стоимость запчастей (₽)"
                  min={0}
                  value={form.partsCost}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      partsCost: typeof value === 'number' ? value : Number(value) || 0,
                    }))
                  }
                />

                <Button leftSection={<IconPlus size={14} />} onClick={addFault}>
                  Добавить
                </Button>
              </Group>
            </Stack>
          </Paper>

          {form.faults.length > 0 && (
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Text fw={600}>Добавленные неисправности</Text>
                {form.faults.map((fault, index) => (
                  <Card key={`${fault.category}-${index}`} withBorder radius="md" p="sm">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={500}>{fault.category}</Text>
                        <Text size="sm" c="dimmed">
                          {fault.description}
                        </Text>
                      </div>

                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => removeFault(index)}
                        aria-label="Удалить неисправность"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Paper>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={handleCloseModal}>
              Отмена
            </Button>

            <Button
              onClick={editingRepair ? handleUpdateRepair : handleCreateRepair}
              loading={saving}
            >
              {editingRepair ? 'Сохранить изменения' : 'Зарегистрировать ремонт'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={receiptOpened}
        onClose={() => {
          closeReceipt();
          setSelectedRepair(null);
        }}
        title="Расписка о приеме автомобиля"
        size="lg"
        centered
      >
        {selectedRepair && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text ta="center" fw={700} size="lg">
                  РАСПИСКА №{selectedRepair.id}
                </Text>
                <Divider />
                <Text size="sm">
                  <b>Автомобиль:</b> {getCarLabel(Number(selectedRepair.carId))}
                </Text>
                <Text size="sm">
                  <b>Клиент:</b> {getClientLabel(Number(selectedRepair.clientId))}
                </Text>
                <Text size="sm">
                  <b>Ожидаемая дата возврата:</b> {safeDate(selectedRepair.expectedReturnDate)}
                </Text>
                <Text size="sm">
                  <b>Мастер:</b> {getEmployeeLabel(selectedRepair.masterId)}
                </Text>
                <Text size="sm">
                  <b>Статус:</b> {getStatusLabel(selectedRepair.status)}
                </Text>
                <Divider />
                <Text fw={500} size="sm">
                  Неисправности:
                </Text>
                <Stack gap={6}>
                  {(selectedRepair.faults ?? []).map((fault, index) => (
                    <Text key={`${selectedRepair.id}-${index}`} size="sm">
                      • {fault.category}: {fault.description}
                    </Text>
                  ))}
                </Stack>

                <Divider />
                <Group justify="flex-end">
                  <Stack gap={0} align="flex-end">
                    <Text size="sm" fw={700}>
                      ИТОГО К ОПЛАТЕ:
                    </Text>
                    <Title order={3} c="blue">
                      {totalRepairCost(selectedRepair).toLocaleString()} ₽
                    </Title>
                  </Stack>
                </Group>
              </Stack>
            </Paper>

            <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>
              Печать
            </Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}