import React, { useState, useEffect } from 'react';
import { Title, Button, Group, Stack, Card, Text, Badge, Modal, Select, TextInput, NumberInput, Divider, Accordion, List, ActionIcon, Paper } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconTool, IconCheck, IconPrinter, IconTrash } from '@tabler/icons-react';
import { api } from '../services/api.ts';
import { Repair, Car, Client, Employee, Fault, FaultStatus, FAULT_STATUS_LABELS } from '../types.ts';
import { WORK_CATEGORIES } from '../constants.ts';
import dayjs from 'dayjs';
import { notifications } from '@mantine/notifications';

export default function RepairsPage() {
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [opened, { open, close }] = useDisclosure(false);
  const [receiptOpened, { open: openReceipt, close: closeReceipt }] = useDisclosure(false);
  
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  
  const [newRepair, setNewRepair] = useState<Partial<Repair>>({
    faults: []
  });

  const [tempFault, setTempFault] = useState<Partial<Fault>>({
    description: '',
    costParts: 0,
    costLabor: 0,
    timeHours: 0,
    status: FaultStatus.PENDING
  });

  useEffect(() => {
    const fetchData = async () => {
      setRepairs((await api.getRepairs()).filter(r => !r.isArchived));
      setCars(await api.getCars());
      setClients(await api.getClients());
      setEmployees((await api.getEmployees()).filter(e => e.isActive));
    };
    fetchData();
  }, []);

  const handleCreateRepair = async () => {
    if (newRepair.carId && newRepair.clientId && newRepair.dateDeadline) {
      const repair: Repair = {
        id: Math.random().toString(36).substr(2, 9),
        carId: newRepair.carId,
        clientId: newRepair.clientId,
        dateReceived: new Date().toISOString(),
        dateDeadline: newRepair.dateDeadline,
        faults: newRepair.faults || [],
        isArchived: false
      };
      await api.saveRepair(repair);
      setRepairs((await api.getRepairs()).filter(r => !r.isArchived));
      notifications.show({ title: 'Успешно', message: 'Заявка на ремонт создана', color: 'green' });
      setNewRepair({ faults: [] });
      close();
    }
  };

  const addFault = () => {
    if (tempFault.description) {
      const fault: Fault = {
        id: Math.random().toString(36).substr(2, 9),
        description: tempFault.description,
        type: tempFault.type || 'Общее',
        costParts: tempFault.costParts || 0,
        costLabor: tempFault.costLabor || 0,
        timeHours: tempFault.timeHours || 0,
        status: FaultStatus.PENDING,
        assignedWorkerId: tempFault.assignedWorkerId
      };
      setNewRepair({ ...newRepair, faults: [...(newRepair.faults || []), fault] });
      setTempFault({ description: '', type: '', costParts: 0, costLabor: 0, timeHours: 0, status: FaultStatus.PENDING });
    }
  };

  const finishRepair = async (repair: Repair) => {
    const updated: Repair = { 
      ...repair, 
      isArchived: true, 
      dateFinished: new Date().toISOString(),
      faults: repair.faults.map(f => ({ ...f, status: FaultStatus.RESOLVED }))
    };
    await api.saveRepair(updated);
    setRepairs((await api.getRepairs()).filter(r => !r.isArchived));
    notifications.show({ title: 'Ремонт завершен', message: 'Данные перенесены в архив. Выставлен счет.', color: 'blue' });
  };

  const updateFaultStatus = async (repair: Repair, faultId: string, newStatus: FaultStatus) => {
    const updatedFaults = repair.faults.map(f => f.id === faultId ? { ...f, status: newStatus } : f);
    const updatedRepair = { ...repair, faults: updatedFaults };
    await api.saveRepair(updatedRepair);
    setRepairs((await api.getRepairs()).filter(r => !r.isArchived));
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>Текущий ремонт</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={open}>Оформить заявку</Button>
      </Group>

      <Accordion variant="separated">
        {repairs.map(repair => {
          const car = cars.find(c => c.id === repair.carId);
          const client = clients.find(c => c.id === repair.clientId);
          
          return (
            <Accordion.Item key={repair.id} value={repair.id}>
              <Accordion.Control>
                <Group justify="space-between" pr="md">
                  <Group>
                    <IconTool size={20} color="gray" />
                    <Stack gap={0}>
                      <Text fw={700}>{car?.make} {car?.model} ({car?.licensePlate})</Text>
                      <Text size="xs" c="dimmed">Клиент: {client?.fullName}</Text>
                    </Stack>
                  </Group>
                  <Group>
                    <Badge color="yellow" variant="light">Срок: {dayjs(repair.dateDeadline).format('DD.MM.YYYY')}</Badge>
                    <Badge color="blue">{repair.faults.length} неиспр.</Badge>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack p="xs">
                  <Title order={5}>Перечень работ:</Title>
                  <List spacing="xs" size="sm" center>
                    {repair.faults.map(f => {
                      const worker = employees.find(e => e.id === f.assignedWorkerId);
                      return (
                        <List.Item key={f.id}>
                          <Group justify="space-between" wrap="nowrap" gap="xl">
                            <Text style={{ flex: 1 }}>{f.description}</Text>
                            <Group gap="xs" style={{ flex: 2 }}>
                                <Select 
                                  size="xs"
                                  data={Object.entries(FAULT_STATUS_LABELS).map(([val, label]) => ({ value: val, label }))}
                                  value={f.status}
                                  onChange={(val) => updateFaultStatus(repair, f.id, val as FaultStatus)}
                                  styles={{ input: { height: '24px', minHeight: '24px' } }}
                                  w={120}
                                />
                                <Text size="xs" c="dimmed">Мастер: {worker?.fullName || 'Не назначен'}</Text>
                            </Group>
                            <Text size="xs" style={{ flex: 0.5 }}>{f.timeHours} ч.</Text>
                          </Group>
                        </List.Item>
                      );
                    })}
                  </List>
                  <Divider my="sm" />
                  <Group justify="flex-end">
                    <Button variant="light" leftSection={<IconPrinter size={16} />} onClick={() => { setSelectedRepair(repair); openReceipt(); }}>
                      Печать расписки
                    </Button>
                    <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => finishRepair(repair)}>
                      Завершить и выдать счет
                    </Button>
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>

      <Modal opened={opened} onClose={close} title="Оформление автомобиля в ремонт" size="xl">
        <Stack>
          <Group grow>
            <Select 
              label="Автомобиль" 
              required
              data={cars.map(c => ({ value: c.id, label: `${c.licensePlate} - ${c.make} ${c.model}` }))}
              value={newRepair.carId}
              onChange={(val) => setNewRepair({ ...newRepair, carId: val || '' })}
            />
            <Select 
              label="Клиент (кто сдает)" 
              required
              data={clients.map(c => ({ value: c.id, label: c.fullName }))}
              value={newRepair.clientId}
              onChange={(val) => setNewRepair({ ...newRepair, clientId: val || '' })}
            />
          </Group>
          <DateInput 
             label="Ожидаемая дата возврата"
             required
             value={newRepair.dateDeadline ? new Date(newRepair.dateDeadline) : null}
             onChange={(val) => setNewRepair({ ...newRepair, dateDeadline: val ? dayjs(val).toISOString() : undefined })}
          />

          <Paper withBorder p="md" mt="md">
            <Title order={5} mb="xs">Добавить неисправность</Title>
            <Stack gap="sm">
              <Group grow>
                <Select 
                  label="Тип (Категория)" 
                  placeholder="Выберите категорию"
                  data={WORK_CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
                  value={tempFault.type}
                  onChange={(val) => setTempFault({ ...tempFault, type: val || '', description: '' })}
                />
                <Select 
                  label="Стандартная операция" 
                  placeholder="Или введите описание ниже"
                  disabled={!tempFault.type}
                  data={WORK_CATEGORIES.find(c => c.value === tempFault.type)?.jobs.map(j => ({ value: j, label: j })) || []}
                  value={tempFault.description}
                  onChange={(val) => setTempFault({ ...tempFault, description: val || '' })}
                  searchable
                />
              </Group>
              <Group align="flex-end">
                <TextInput 
                  label="Описание (уточнение)" 
                  placeholder="Замена масла или специфическое описание" 
                  style={{ flex: 1 }} 
                  value={tempFault.description}
                  onChange={(e) => setTempFault({ ...tempFault, description: e.target.value })}
                  required
                />
                <Select 
                  label="Мастер" 
                  placeholder="Выбрать" 
                  data={employees.map(e => ({ value: e.id, label: `${e.fullName} (${e.specialty})` }))}
                  value={tempFault.assignedWorkerId}
                  onChange={(val) => setTempFault({ ...tempFault, assignedWorkerId: val || '' })}
                />
              </Group>
              <Group grow mt="xs" align="flex-end">
                <NumberInput 
                  label="Нормо-часы" 
                  value={tempFault.timeHours}
                  onChange={(val) => setTempFault({ ...tempFault, timeHours: Number(val) })}
                />
                <NumberInput 
                  label="Стоимость работ (₽)" 
                  value={tempFault.costLabor}
                  onChange={(val) => setTempFault({ ...tempFault, costLabor: Number(val) })}
                />
                <NumberInput 
                  label="Стоимость запчастей (₽)" 
                  value={tempFault.costParts}
                  onChange={(val) => setTempFault({ ...tempFault, costParts: Number(val) })}
                />
                <Button leftSection={<IconPlus size={14} />} onClick={addFault}>Добавить</Button>
              </Group>
            </Stack>

            {newRepair.faults && newRepair.faults.length > 0 && (
              <Stack mt="md">
                <Text fw={500} size="sm">Добавленные неисправности:</Text>
                {newRepair.faults.map((f, i) => (
                  <Group key={i} justify="space-between" align="center">
                    <Group gap="xs">
                      <Text size="sm">{f.description} ({f.timeHours} ч.) -</Text>
                      <Badge size="xs" variant="outline">{FAULT_STATUS_LABELS[f.status]}</Badge>
                    </Group>
                    <ActionIcon color="red" variant="subtle" onClick={() => {
                      const updated = [...(newRepair.faults || [])];
                      updated.splice(i, 1);
                      setNewRepair({ ...newRepair, faults: updated });
                    }}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>

          <Button onClick={handleCreateRepair} mt="xl" size="lg">Зарегистрировать ремонт</Button>
        </Stack>
      </Modal>

      <Modal opened={receiptOpened} onClose={closeReceipt} title="Расписка о приеме автомобиля" size="lg">
        {selectedRepair && (
          <Stack gap="md">
            <Paper p="md" withBorder className="printable-content">
              <Stack gap="xs">
                <Text ta="center" fw={700} size="lg">РАСПИСКА №{selectedRepair.id}</Text>
                <Divider />
                <Text size="sm"><b>Дата приема:</b> {dayjs(selectedRepair.dateReceived).format('DD.MM.YYYY HH:mm')}</Text>
                <Text size="sm"><b>Автомобиль:</b> {cars.find(c => c.id === selectedRepair.carId)?.make} {cars.find(c => c.id === selectedRepair.carId)?.licensePlate}</Text>
                <Text size="sm"><b>Клиент:</b> {clients.find(c => c.id === selectedRepair.clientId)?.fullName}</Text>
                <Text size="sm"><b>Обязуемся вернуть:</b> {dayjs(selectedRepair.dateDeadline).format('DD.MM.YYYY')}</Text>
                <Divider />
                <Text fw={500} size="sm">Выявленные неисправности:</Text>
                <List size="sm" withPadding>
                  {selectedRepair.faults.map(f => <List.Item key={f.id}>{f.description}</List.Item>)}
                </List>
                <Text size="xs" mt="md" ta="center" c="dimmed">СТО «АвтоМастер». Подпись диспетчера: _________</Text>
              </Stack>
            </Paper>
            <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()} className="no-print">Печать</Button>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
