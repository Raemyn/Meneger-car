import React, { useState, useEffect } from 'react';
import { Title, Paper, Group, Stack, Text, Select, SimpleGrid, Table, List, Badge, Divider, Button, ActionIcon } from '@mantine/core';
import { api } from '../services/api.ts';
import { Repair, Car, Employee } from '../types.ts';
import dayjs from 'dayjs';
import { IconPrinter } from '@tabler/icons-react';

export default function ReportsPage() {
  const [month, setMonth] = useState<string>(dayjs().format('YYYY-MM'));
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setRepairs(await api.getRepairs());
      setCars(await api.getCars());
      setEmployees(await api.getEmployees());
    };
    fetchData();
  }, []);

  // Generate dynamic months for the selector
  const monthData = Array.from({ length: 6 }).map((_, i) => {
    const d = dayjs().subtract(i, 'month');
    return { value: d.format('YYYY-MM'), label: d.format('MMMM YYYY') };
  });

  const archivedInMonth = repairs.filter(r => 
    r.isArchived && r.dateFinished && dayjs(r.dateFinished).format('YYYY-MM') === month
  );
  
  const activeDuringMonth = repairs.filter(r => {
    const received = dayjs(r.dateReceived);
    const startOfMonth = dayjs(month).startOf('month');
    const endOfMonth = dayjs(month).endOf('month');
    
    // Repair is active during the month if it was received before end of month
    // AND it was either never finished OR finished after start of month
    const wasReceived = received.isBefore(endOfMonth);
    const isStillActive = !r.isArchived || (r.dateFinished && dayjs(r.dateFinished).isAfter(startOfMonth));
    
    return wasReceived && isStillActive && !archivedInMonth.find(ar => ar.id === r.id);
  });

  // Stats
  const totalIncome = archivedInMonth.reduce((acc, r) => 
    acc + r.faults.reduce((fAcc, f) => fAcc + f.costLabor + f.costParts, 0), 0
  );

  const faultTypesReport = archivedInMonth.flatMap(r => r.faults).reduce((acc, f) => {
    const type = f.type || 'Общее';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Stack gap="xl">
      <Group justify="space-between" className="no-print">
        <Title order={2}>Месячный отчет</Title>
        <Group>
          <Button leftSection={<IconPrinter size={16} />} variant="light" onClick={() => window.print()}>
            Распечатать отчет
          </Button>
          <Select 
            label="Выберите период" 
            value={month} 
            onChange={(val) => setMonth(val || '')}
            data={monthData}
          />
        </Group>
      </Group>

      <div className="printable-content">
        <Stack gap="xl">
          <Paper p="md" withBorder>
            <Stack gap="sm">
              <Title order={3} ta="center">ОТЧЕТ О РАБОТЕ СТАНЦИИ ТЕХОБСЛУЖИВАНИЯ</Title>
              <Text ta="center" fw={500} size="lg">Период: {dayjs(month).format('MMMM YYYY')}</Text>
              <Divider my="md" />
              
              <SimpleGrid cols={{ base: 1, md: 3 }} className="no-print-grid">
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">Общий доход за период</Text>
                  <Text size="xl" fw={700} color="green">{totalIncome.toLocaleString()} ₽</Text>
                </Stack>
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">Количество устраненных неисправностей</Text>
                  <Text size="xl" fw={700}>{archivedInMonth.flatMap(r => r.faults).length}</Text>
                </Stack>
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">Автомобилей в работе/принято</Text>
                  <Text size="xl" fw={700}>{activeDuringMonth.length}</Text>
                </Stack>
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper p="md" withBorder>
            <Title order={4} mb="md">Статистика по видам неисправностей (завершенные)</Title>
            <Table withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Вид неисправности</Table.Th>
                  <Table.Th>Количество</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {Object.entries(faultTypesReport).map(([name, count]) => (
                  <Table.Tr key={name}>
                    <Table.Td>{name}</Table.Td>
                    <Table.Td>{count}</Table.Td>
                  </Table.Tr>
                ))}
                {Object.keys(faultTypesReport).length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={2} align="center">Нет данных за этот период</Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>

          <Title order={3}>Отремонтированные автомобили (завершенные)</Title>
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Автомобиль</Table.Th>
                <Table.Th>Список неисправностей</Table.Th>
                <Table.Th>Работники (Сведения)</Table.Th>
                <Table.Th>Время (ч)</Table.Th>
                <Table.Th>Сумма</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {archivedInMonth.map(r => {
                const car = cars.find(c => c.id === r.carId);
                const totalHours = r.faults.reduce((acc, f) => acc + f.timeHours, 0);
                const totalCost = r.faults.reduce((acc, f) => acc + f.costLabor + f.costParts, 0);
                const workers = Array.from(new Set(r.faults.map(f => f.assignedWorkerId))).map(id => employees.find(e => e.id === id)).filter(Boolean);
                
                return (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Text fw={500}>{car?.make} {car?.model}</Text>
                      <Text size="xs" c="dimmed">Гос.номер: {car?.licensePlate}</Text>
                    </Table.Td>
                    <Table.Td>
                      <List size="xs" spacing="xs">
                        {r.faults.map(f => (
                          <List.Item key={f.id}>
                            <Text size="xs" fw={500}>{f.description}</Text>
                            <Text size="xs" c="dimmed">Тип: {f.type}</Text>
                          </List.Item>
                        ))}
                      </List>
                    </Table.Td>
                    <Table.Td>
                      {workers.map(w => (
                        <div key={w?.id}>
                          <Text size="xs">{w?.fullName}</Text>
                          <Text size="xs" c="dimmed">({w?.specialty})</Text>
                        </div>
                      ))}
                    </Table.Td>
                    <Table.Td align="center">{totalHours}</Table.Td>
                    <Table.Td align="right" fw={500}>{totalCost.toLocaleString()} ₽</Table.Td>
                  </Table.Tr>
                );
              })}
              {archivedInMonth.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5} align="center" py="xl">Нет данных за выбранный период</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Title order={3} mt="xl">Автомобили в работе / принятые в период</Title>
          <Table withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Автомобиль</Table.Th>
                <Table.Th>Неисправности / Работники</Table.Th>
                <Table.Th>Принят</Table.Th>
                <Table.Th>Срок сдачи</Table.Th>
                <Table.Th>Затраченное время (ч)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {activeDuringMonth.map(r => {
                const car = cars.find(c => c.id === r.carId);
                const totalHours = r.faults.reduce((acc, f) => acc + f.timeHours, 0);

                return (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Text fw={500}>{car?.make} {car?.model}</Text>
                      <Text size="xs" c="dimmed">{car?.licensePlate}</Text>
                    </Table.Td>
                    <Table.Td>
                      <List size="xs" withPadding>
                        {r.faults.map(f => (
                          <List.Item key={f.id}>
                            {f.description} 
                            <Text component="span" size="xs" c="dimmed" ml="xs" fs="italic">
                              — {employees.find(e => e.id === f.assignedWorkerId)?.fullName}
                            </Text>
                          </List.Item>
                        ))}
                      </List>
                    </Table.Td>
                    <Table.Td>{dayjs(r.dateReceived).format('DD.MM.YYYY')}</Table.Td>
                    <Table.Td>{dayjs(r.dateDeadline).format('DD.MM.YYYY')}</Table.Td>
                    <Table.Td align="center">{totalHours}</Table.Td>
                  </Table.Tr>
                );
              })}
              {activeDuringMonth.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5} align="center" py="xl">Нет активных ремонтных работ в этом периоде</Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
          
          <Divider mt="xl" />
          <Text size="xs" ta="right" c="dimmed">Сформировано: {dayjs().format('DD.MM.YYYY HH:mm')}</Text>
        </Stack>
      </div>
    </Stack>
  );
}
