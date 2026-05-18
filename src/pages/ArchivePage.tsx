import React, { useEffect, useState } from 'react';
import {
  Title,
  Table,
  Group,
  Stack,
  Text,
  ActionIcon,
  Modal,
  Paper,
  Divider,
  Button,
  SimpleGrid,
} from '@mantine/core';
import { IconFileText, IconPrinter } from '@tabler/icons-react';
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
      const [repairsData, carsData, clientsData] = await Promise.all([
        api.getRepairs(),
        api.getCars(),
        api.getClients(),
      ]);

      setRepairs(repairsData.filter((repair) => repair.isArchived));
      setCars(carsData);
      setClients(clientsData);
    };

    fetchData();
  }, []);

  const calculateTotal = (repair: Repair) => {
    return Number(repair.laborCost || 0) + Number(repair.partsCost || 0);
  };

  const getFinishedDate = (repair: Repair) => {
    return repair.updated_at || repair.created_at || repair.expectedReturnDate;
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
            const car = cars.find((c) => c.id === repair.carId);
            const client = clients.find((c) => c.id === repair.clientId);

            return (
              <Table.Tr key={repair.id}>
                <Table.Td>
                  {dayjs(getFinishedDate(repair)).format('DD.MM.YYYY')}
                </Table.Td>

                <Table.Td>
                  {car?.brand} {car?.licensePlate}
                </Table.Td>

                <Table.Td>{client?.fullName}</Table.Td>

                <Table.Td fw={700}>
                  {calculateTotal(repair).toLocaleString()} ₽
                </Table.Td>

                <Table.Td>
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => {
                      setSelectedRepair(repair);
                      open();
                    }}
                  >
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
                    <Title order={3}>ИНВОЙС №{selectedRepair.id}</Title>
                    <Text size="sm" c="dimmed">
                      СТО «АвтоМастер»
                    </Text>
                  </Stack>

                  <Text size="sm">
                    от {dayjs(getFinishedDate(selectedRepair)).format('DD.MM.YYYY')}
                  </Text>
                </Group>

                <Divider my="md" />

                <SimpleGrid cols={2}>
                  <Stack gap={0}>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                      Клиент:
                    </Text>
                    <Text size="sm">
                      {clients.find((c) => c.id === selectedRepair.clientId)?.fullName}
                    </Text>
                    <Text size="xs">
                      Прописка:{' '}
                      {clients.find((c) => c.id === selectedRepair.clientId)?.registrationAddress}
                    </Text>
                  </Stack>

                  <Stack gap={0}>
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                      Автомобиль:
                    </Text>
                    <Text size="sm">
                      {cars.find((c) => c.id === selectedRepair.carId)?.brand}{' '}
                      {cars.find((c) => c.id === selectedRepair.carId)?.model}
                    </Text>
                    <Text size="sm">
                      Госномер: {cars.find((c) => c.id === selectedRepair.carId)?.licensePlate}
                    </Text>
                  </Stack>
                </SimpleGrid>

                <Table withTableBorder mt="xl">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Описание работ</Table.Th>
                      <Table.Th>Категория</Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {(selectedRepair.faults ?? []).map((fault, index) => (
                      <Table.Tr key={`${selectedRepair.id}-${index}`}>
                        <Table.Td>{fault.description}</Table.Td>
                        <Table.Td>{fault.category}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                <Group justify="flex-end" mt="xl">
                  <Stack gap={0} align="flex-end">
                    <Text size="sm" fw={700}>
                      ИТОГО К ОПЛАТЕ:
                    </Text>
                    <Title order={2} c="blue">
                      {calculateTotal(selectedRepair).toLocaleString()} ₽
                    </Title>
                  </Stack>
                </Group>

                <Text size="xs" mt="xl" c="dimmed">
                  Спасибо, что выбрали наш сервис!
                </Text>
              </Stack>
            </Paper>

            <Button
              leftSection={<IconPrinter size={16} />}
              onClick={() => window.print()}
              className="no-print"
            >
              Печать счёта
            </Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}