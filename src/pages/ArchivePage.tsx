import React, { useState, useEffect } from 'react';
import { Title, Table, Group, Stack, Text, Badge, ActionIcon, Modal, Paper, Divider, Button, SimpleGrid } from '@mantine/core';
import { IconFileText, IconPrinter, IconSearch } from '@tabler/icons-react';
import { api } from '../services/api.ts';
import { Repair, Car, Client } from '../types.ts';
import dayjs from 'dayjs';
import { useDisclosure } from '@mantine/hooks';

export default function ArchivePage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setRepairs((await api.getRepairs()).filter(r => r.isArchived));
      setCars(await api.getCars());
      setClients(await api.getClients());
    };
    fetchData();
  }, []);

  const calculateTotal = (repair: Repair) => {
    return repair.faults.reduce((acc, f) => acc + f.costLabor + f.costParts, 0);
  };

  return (
    <Stack gap="xl">
      <Title order={2}>Архив выполненных работ</Title>

      <Table highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Дата выдачи</Table.Th>
            <Table.Th>Автомобиль</Table.Th>
            <Table.Th>Клиент</Table.Th>
            <Table.Th>Сумма счета</Table.Th>
            <Table.Th>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {repairs.map((repair) => {
            const car = cars.find(c => c.id === repair.carId);
            const client = clients.find(c => c.id === repair.clientId);
            return (
              <Table.Tr key={repair.id}>
                <Table.Td>{dayjs(repair.dateFinished).format('DD.MM.YYYY')}</Table.Td>
                <Table.Td>{car?.make} {car?.licensePlate}</Table.Td>
                <Table.Td>{client?.fullName}</Table.Td>
                <Table.Td fw={700}>{calculateTotal(repair).toLocaleString()} ₽</Table.Td>
                <Table.Td>
                  <ActionIcon variant="light" color="blue" onClick={() => { setSelectedRepair(repair); open(); }}>
                    <IconFileText size={18} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title="Счёт на оплату услуг СТО" size="lg">
        {selectedRepair && (
          <Stack gap="md">
            <Paper p="xl" withBorder id="invoice-content" className="printable-content">
              <Stack gap="xs">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={0}>
                    <Title order={3}>ИНВОЙС №{selectedRepair.id.toUpperCase()}</Title>
                    <Text size="sm" c="dimmed">СТО «АвтоМастер»</Text>
                  </Stack>
                  <Text size="sm">от {dayjs(selectedRepair.dateFinished).format('DD.MM.YYYY')}</Text>
                </Group>
                
                <Divider my="md" />
                
                <SimpleGrid cols={2}>
                  <Stack gap={0}>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Клиент:</Text>
                    <Text size="sm">{clients.find(c => c.id === selectedRepair.clientId)?.fullName}</Text>
                    <Text size="xs">Прописка: {clients.find(c => c.id === selectedRepair.clientId)?.registrationAddress}</Text>
                  </Stack>
                  <Stack gap={0}>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">Автомобиль:</Text>
                    <Text size="sm">{cars.find(c => c.id === selectedRepair.carId)?.make} {cars.find(c => c.id === selectedRepair.carId)?.model}</Text>
                    <Text size="sm">Госномер: {cars.find(c => c.id === selectedRepair.carId)?.licensePlate}</Text>
                  </Stack>
                </SimpleGrid>

                <Table withTableBorder mt="xl">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Описание работ</Table.Th>
                      <Table.Th>Время (ч)</Table.Th>
                      <Table.Th>Работа (₽)</Table.Th>
                      <Table.Th>Запчасти (₽)</Table.Th>
                      <Table.Th>Итого (₽)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {selectedRepair.faults.map(f => (
                      <Table.Tr key={f.id}>
                        <Table.Td>{f.description}</Table.Td>
                        <Table.Td>{f.timeHours}</Table.Td>
                        <Table.Td>{f.costLabor}</Table.Td>
                        <Table.Td>{f.costParts}</Table.Td>
                        <Table.Td fw={500}>{f.costLabor + f.costParts}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                <Group justify="flex-end" mt="xl">
                  <Stack gap={0} align="flex-end">
                    <Text size="sm" fw={700}>ИТОГО К ОПЛАТЕ:</Text>
                    <Title order={2} c="blue">{calculateTotal(selectedRepair).toLocaleString()} ₽</Title>
                  </Stack>
                </Group>
                
                <Text size="xs" mt="xl" c="dimmed">Спасибо, что выбрали наш сервис!</Text>
              </Stack>
            </Paper>
            <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()} className="no-print">Печать счёта</Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
