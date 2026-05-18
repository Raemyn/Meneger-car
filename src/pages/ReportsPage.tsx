import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  List,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconPrinter } from '@tabler/icons-react';
import dayjs from 'dayjs';

import { api } from '../services/api.ts';
import { Car, Employee, Repair } from '../types.ts';

export default function ReportsPage() {
  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [repairsData, carsData, employeesData] = await Promise.all([
        api.getRepairs(),
        api.getCars(),
        api.getEmployees(),
      ]);

      setRepairs(repairsData);
      setCars(carsData);
      setEmployees(employeesData);
    };

    fetchData();
  }, []);

  const monthData = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => {
        const d = dayjs().subtract(i, 'month');
        return {
          value: d.format('YYYY-MM'),
          label: d.format('MM.YYYY'),
        };
      }),
    []
  );

  const getRepairCreatedAt = (repair: Repair) =>
    dayjs(repair.created_at ?? repair.updated_at ?? repair.expectedReturnDate);

  const getRepairFinishedAt = (repair: Repair) =>
    dayjs(repair.updated_at ?? repair.created_at ?? repair.expectedReturnDate);

  const startOfMonth = dayjs(month).startOf('month');
  const endOfMonth = dayjs(month).endOf('month');

  const archivedInMonth = repairs.filter(
    (repair) =>
      repair.isArchived &&
      getRepairFinishedAt(repair).isValid() &&
      getRepairFinishedAt(repair).format('YYYY-MM') === month
  );

  const activeDuringMonth = repairs.filter((repair) => {
    const createdAt = getRepairCreatedAt(repair);
    const finishedAt = getRepairFinishedAt(repair);

    const wasCreatedBeforeMonthEnded = createdAt.isBefore(endOfMonth);
    const wasActiveInMonth = !repair.isArchived || finishedAt.isAfter(startOfMonth);

    return (
      wasCreatedBeforeMonthEnded &&
      wasActiveInMonth &&
      !archivedInMonth.some((archivedRepair) => archivedRepair.id === repair.id)
    );
  });

  const totalIncome = archivedInMonth.reduce(
    (acc, repair) => acc + Number(repair.laborCost || 0) + Number(repair.partsCost || 0),
    0
  );

  const totalFinishedFaults = archivedInMonth.flatMap((repair) => repair.faults || []).length;

  const faultTypesReport = archivedInMonth
    .flatMap((repair) => repair.faults || [])
    .reduce((acc, fault) => {
      const type = fault.category?.trim() || 'Общее';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const getCarLabel = (carId: number) => {
    const car = cars.find((item) => item.id === carId);
    if (!car) return 'Автомобиль не найден';
    return `${car.brand} ${car.model}`;
  };

  const getCarPlate = (carId: number) => {
    const car = cars.find((item) => item.id === carId);
    return car?.licensePlate || '-';
  };

  const getMasterLabel = (masterId?: number | null) => {
    if (!masterId) return 'Не назначен';
    return employees.find((e) => e.id === masterId)?.fullName || 'Мастер не найден';
  };

  const getTotalHours = (repair: Repair) => Number(repair.laborHours || 0);

  return (
    <Stack gap="xl">
      <Group justify="space-between" className="no-print" align="flex-end">
        <div>
          <Title order={2}>Месячный отчет</Title>
          <Text c="dimmed" size="sm">
            Отчет за период по ремонту автомобилей
          </Text>
        </div>

        <Group align="flex-end">
          <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={() => window.print()}>
            Распечатать отчет
          </Button>

          <Select
            label="Выберите период"
            value={month}
            onChange={(val) => setMonth(val ?? dayjs().format('YYYY-MM'))}
            data={monthData}
            searchable={false}
            allowDeselect={false}
          />
        </Group>
      </Group>

      <div className="printable-content">
        <Stack gap="xl">
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Title order={3} ta="center">
                ОТЧЕТ О РАБОТЕ СТАНЦИИ ТЕХОБСЛУЖИВАНИЯ
              </Title>
              <Text ta="center" fw={500} size="lg">
                Период: {dayjs(month).format('MM.YYYY')}
              </Text>
              <Divider my="md" />

              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    Общий доход за период
                  </Text>
                  <Text size="xl" fw={700} c="green">
                    {totalIncome.toLocaleString()} ₽
                  </Text>
                </Stack>

                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    Количество устраненных неисправностей
                  </Text>
                  <Text size="xl" fw={700}>
                    {totalFinishedFaults}
                  </Text>
                </Stack>

                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    Автомобилей в работе / принятых
                  </Text>
                  <Text size="xl" fw={700}>
                    {activeDuringMonth.length}
                  </Text>
                </Stack>
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper p="md" withBorder>
            <Title order={4} mb="md">
              Статистика по видам неисправностей
            </Title>

            <Table withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Вид неисправности</Table.Th>
                  <Table.Th>Количество</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {Object.entries(faultTypesReport).length > 0 ? (
                  Object.entries(faultTypesReport).map(([name, count]) => (
                    <Table.Tr key={name}>
                      <Table.Td>{name}</Table.Td>
                      <Table.Td>{count}</Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={2}>
                      <Text ta="center" c="dimmed">
                        Нет данных за этот период
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>

          <Title order={3}>Завершенные ремонты</Title>
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Автомобиль</Table.Th>
                <Table.Th>Список неисправностей</Table.Th>
                <Table.Th>Мастер</Table.Th>
                <Table.Th>Время (ч)</Table.Th>
                <Table.Th>Сумма</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {archivedInMonth.length > 0 ? (
                archivedInMonth.map((repair) => {
                  const totalHours = getTotalHours(repair);
                  const totalCost = Number(repair.laborCost || 0) + Number(repair.partsCost || 0);

                  return (
                    <Table.Tr key={repair.id}>
                      <Table.Td>
                        <Text fw={500}>
                          {getCarLabel(Number(repair.carId))}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Гос.номер: {getCarPlate(Number(repair.carId))}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        <List size="xs" spacing="xs">
                          {repair.faults.map((fault, index) => (
                            <List.Item key={`${repair.id}-${index}`}>
                              <Text size="xs" fw={500}>
                                {fault.description}
                              </Text>
                              <Text size="xs" c="dimmed">
                                Категория: {fault.category}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </Table.Td>

                      <Table.Td>
                        <Text size="sm">{getMasterLabel(repair.masterId)}</Text>
                      </Table.Td>

                      <Table.Td>
                        <Text ta="center">{totalHours}</Text>
                      </Table.Td>

                      <Table.Td>
                        <Text ta="right" fw={500}>
                          {totalCost.toLocaleString()} ₽
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" py="xl" c="dimmed">
                      Нет данных за выбранный период
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Title order={3} mt="xl">
            Автомобили в работе / принятые в период
          </Title>
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Автомобиль</Table.Th>
                <Table.Th>Неисправности</Table.Th>
                <Table.Th>Мастер</Table.Th>
                <Table.Th>Принят</Table.Th>
                <Table.Th>Срок сдачи</Table.Th>
                <Table.Th>Затраченное время (ч)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activeDuringMonth.length > 0 ? (
                activeDuringMonth.map((repair) => {
                  const totalHours = getTotalHours(repair);

                  return (
                    <Table.Tr key={repair.id}>
                      <Table.Td>
                        <Text fw={500}>
                          {getCarLabel(Number(repair.carId))}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {getCarPlate(Number(repair.carId))}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        <List size="xs" withPadding spacing="xs">
                          {repair.faults.map((fault, index) => (
                            <List.Item key={`${repair.id}-${index}`}>
                              <Text size="xs">
                                {fault.description}
                              </Text>
                              <Text component="span" size="xs" c="dimmed" ml="xs" fs="italic">
                                — {fault.category}
                              </Text>
                            </List.Item>
                          ))}
                        </List>
                      </Table.Td>

                      <Table.Td>
                        <Text size="sm">{getMasterLabel(repair.masterId)}</Text>
                      </Table.Td>

                      <Table.Td>
                        {dayjs(repair.created_at ?? repair.updated_at ?? repair.expectedReturnDate).format('DD.MM.YYYY')}
                      </Table.Td>

                      <Table.Td>
                        {dayjs(repair.expectedReturnDate).format('DD.MM.YYYY')}
                      </Table.Td>

                      <Table.Td>
                        <Text ta="center">{totalHours}</Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text ta="center" py="xl" c="dimmed">
                      Нет активных ремонтных работ в этом периоде
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Divider mt="xl" />
          <Text size="xs" ta="right" c="dimmed">
            Сформировано: {dayjs().format('DD.MM.YYYY HH:mm')}
          </Text>
        </Stack>
      </div>
    </Stack>
  );
}