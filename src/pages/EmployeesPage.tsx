import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  NumberInput,
  Title,
  Divider,
  LoadingOverlay,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconSearch, IconTrash, IconUserPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

import { api } from '../services/api.ts';
import { Employee } from '../types.ts';

type EmployeeForm = Partial<Employee>;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opened, { open, close }] = useDisclosure(false);
  const [search, setSearch] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<EmployeeForm | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees(true);
      setEmployees(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();

    return employees.filter((emp) =>
      [emp.fullName, emp.specialty, String(emp.grade), String(emp.experienceYears)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [employees, search]);

  const openCreateModal = () => {
    setEditingEmployee({
      fullName: '',
      specialty: '',
      grade: 1,
      experienceYears: 0,
      isActive: true,
    });
    open();
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee({ ...employee });
    open();
  };

  const handleSave = async () => {
    if (!editingEmployee?.fullName?.trim() || !editingEmployee?.specialty?.trim()) {
      notifications.show({
        title: 'Ошибка',
        message: 'Заполни ФИО и специальность',
        color: 'red',
      });
      return;
    }

    try {
      setSaving(true);

      const payload: Employee = {
        id: editingEmployee.id ?? Date.now(),
        fullName: editingEmployee.fullName.trim(),
        specialty: editingEmployee.specialty.trim(),
        grade: Number(editingEmployee.grade ?? 1),
        experienceYears: Number(editingEmployee.experienceYears ?? 0),
        isActive: editingEmployee.isActive ?? true,
      };

      await api.saveEmployee(payload);
      await fetchEmployees();

      notifications.show({
        title: 'Успешно',
        message: 'Сотрудник сохранён',
        color: 'green',
      });

      close();
    } catch {
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось сохранить сотрудника',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFire = (id: number, name: string) => {
    modals.openConfirmModal({
      title: 'Подтверждение удаления',
      children: (
        <Text size="sm">
          Ты действительно хочешь удалить сотрудника <b>{name}</b>?
        </Text>
      ),
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.deleteEmployee(id);
          await fetchEmployees();

          notifications.show({
            title: 'Готово',
            message: 'Сотрудник удалён',
            color: 'green',
          });
        } catch {
          notifications.show({
            title: 'Ошибка',
            message: 'Не удалось удалить сотрудника',
            color: 'red',
          });
        }
      },
    });
  };

  return (
    <Paper p="xl" radius="lg" shadow="sm" pos="relative">
      <LoadingOverlay visible={loading} />

      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Управление персоналом</Title>
            <Text c="dimmed" size="sm">
              Список сотрудников, редактирование и удаление
            </Text>
          </div>

          <Button leftSection={<IconUserPlus size={18} />} onClick={openCreateModal}>
            Принять на работу
          </Button>
        </Group>

        <TextInput
          placeholder="Поиск по ФИО, специальности, разряду или стажу"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <Paper withBorder radius="md">
          <ScrollArea>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ФИО</Table.Th>
                  <Table.Th>Специальность</Table.Th>
                  <Table.Th>Разряд</Table.Th>
                  <Table.Th>Стаж</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th style={{ width: 110 }}>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <Table.Tr key={emp.id}>
                      <Table.Td fw={500}>{emp.fullName}</Table.Td>
                      <Table.Td>{emp.specialty}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">{emp.grade}</Badge>
                      </Table.Td>
                      <Table.Td>
                        {emp.experienceYears} {emp.experienceYears === 1 ? 'год' : 'лет'}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={emp.isActive ? 'green' : 'gray'} variant="light">
                          {emp.isActive ? 'Работает' : 'Уволен'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => openEditModal(emp)}
                            aria-label="Редактировать"
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => handleFire(emp.id, emp.fullName)}
                            aria-label="Удалить"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text ta="center" c="dimmed" py="md">
                        {search ? 'Ничего не найдено' : 'Список сотрудников пуст'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title={editingEmployee?.id ? 'Редактировать сотрудника' : 'Новый сотрудник'}
        centered
      >
        <Stack>
          <TextInput
            label="ФИО"
            placeholder="Иванов Иван Иванович"
            required
            value={editingEmployee?.fullName || ''}
            onChange={(e) =>
              setEditingEmployee((prev) => ({ ...prev, fullName: e.currentTarget.value }))
            }
          />

          <TextInput
            label="Специальность"
            placeholder="Автомеханик"
            required
            value={editingEmployee?.specialty || ''}
            onChange={(e) =>
              setEditingEmployee((prev) => ({ ...prev, specialty: e.currentTarget.value }))
            }
          />

          <Group grow>
            <NumberInput
              label="Разряд"
              min={1}
              max={6}
              value={editingEmployee?.grade ?? 1}
              onChange={(val) =>
                setEditingEmployee((prev) => ({ ...prev, grade: Number(val) || 1 }))
              }
            />

            <NumberInput
              label="Стаж (лет)"
              min={0}
              value={editingEmployee?.experienceYears ?? 0}
              onChange={(val) =>
                setEditingEmployee((prev) => ({
                  ...prev,
                  experienceYears: Number(val) || 0,
                }))
              }
            />
          </Group>

          <Divider my="xs" />

          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Отмена
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}