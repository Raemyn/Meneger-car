import React, { useState, useEffect } from 'react';
import { Title, Table, Button, Group, Modal, TextInput, NumberInput, Stack, Select, ActionIcon, Badge, Paper, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconUserPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import { api } from '../services/api.ts';
import { Employee } from '../types.ts';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setEmployees(await api.getEmployees(true));
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (editingEmployee?.fullName && editingEmployee?.specialty) {
      const newEmp: Employee = {
        id: editingEmployee.id || Math.random().toString(36).substr(2, 9),
        fullName: editingEmployee.fullName,
        specialty: editingEmployee.specialty,
        grade: editingEmployee.grade || 1,
        experienceYears: editingEmployee.experienceYears || 0,
        isActive: editingEmployee.isActive ?? true,
      };
      await api.saveEmployee(newEmp);
      setEmployees(await api.getEmployees(true));
      notifications.show({ title: 'Успешно', message: 'Данные сотрудника сохранены', color: 'green' });
      close();
    }
  };

  const handleFire = (id: string, name: string) => {
    modals.openConfirmModal({
      title: 'Подтверждение увольнения',
      children: (
        <Text size="sm">
          Вы действительно хотите уволить сотрудника <b>{name}</b>? Это действие архивирует его учетную запись.
        </Text>
      ),
      labels: { confirm: 'Уволить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        const emp = employees.find(e => e.id === id);
        if (emp) {
          await api.saveEmployee({ ...emp, isActive: false });
          setEmployees(await api.getEmployees(true));
          notifications.show({ title: 'Информация', message: 'Сотрудник уволен', color: 'gray' });
        } else {
          await api.deleteEmployee(id);
          setEmployees(await api.getEmployees(true));
        }
      },
    });
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>Управление персоналом</Title>
        <Button leftSection={<IconUserPlus size={18} />} onClick={() => { setEditingEmployee({}); open(); }}>
          Принять на работу
        </Button>
      </Group>

      <Table highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ФИО</Table.Th>
            <Table.Th>Специальность</Table.Th>
            <Table.Th>Разряд</Table.Th>
            <Table.Th>Стаж (лет)</Table.Th>
            <Table.Th>Действие</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {employees.map((emp) => (
            <Table.Tr key={emp.id}>
              <Table.Td>{emp.fullName}</Table.Td>
              <Table.Td>{emp.specialty}</Table.Td>
              <Table.Td>{emp.grade}</Table.Td>
              <Table.Td>{emp.experienceYears}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="light" color="blue" onClick={() => { setEditingEmployee(emp); open(); }}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="light" color="red" title="Уволить" onClick={() => handleFire(emp.id, emp.fullName)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title={editingEmployee?.id ? "Редактировать сотрудника" : "Новый сотрудник"}>
        <Stack>
          <TextInput 
            label="ФИО" 
            required 
            value={editingEmployee?.fullName || ''} 
            onChange={(e) => setEditingEmployee({ ...editingEmployee, fullName: e.target.value })}
          />
          <TextInput 
            label="Специальность" 
            required 
            value={editingEmployee?.specialty || ''}
            onChange={(e) => setEditingEmployee({ ...editingEmployee, specialty: e.target.value })}
          />
          <Group grow>
            <NumberInput 
              label="Разряд" 
              min={1} max={6} 
              value={editingEmployee?.grade || 1}
              onChange={(val) => setEditingEmployee({ ...editingEmployee, grade: Number(val) })}
            />
            <NumberInput 
              label="Стаж (лет)" 
              min={0} 
              value={editingEmployee?.experienceYears || 0}
              onChange={(val) => setEditingEmployee({ ...editingEmployee, experienceYears: Number(val) })}
            />
          </Group>
          <Button onClick={handleSave} mt="md">Сохранить</Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
