import React, { useEffect, useState } from "react";
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconEdit,
  IconHistory,
  IconTool,
} from "@tabler/icons-react";
import { api } from "../services/api.ts";
import { Client, Repair, FAULT_STATUS_LABELS } from "../types.ts";
import dayjs from "dayjs";

type CarItem = {
  id: string | number;
  ownerId: string | number;
  brand?: string;
  make?: string;
  model?: string;
  licensePlate?: string;
  color?: string;
  year?: number;
  client?: Client | null;
  ownerName?: string;
};

type EditingCar = Partial<CarItem>;

export default function CarsPage() {
  const [cars, setCars] = useState<CarItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);
  const [clientOpened, { open: openClient, close: closeClient }] = useDisclosure(false);
  const [editingCar, setEditingCar] = useState<EditingCar | null>(null);
  const [selectedCarForHistory, setSelectedCarForHistory] = useState<CarItem | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const carsData = await api.getCars();
      const clientsData = await api.getClients();
      const repairsData = await api.getRepairs();

      setCars(carsData as CarItem[]);
      setClients(clientsData);
      setRepairs(repairsData);
    };

    fetchData();
  }, []);

  const getCarBrand = (car: CarItem) => car.brand ?? car.make ?? "";
  const getCarOwnerName = (car: CarItem) => car.client?.fullName ?? car.ownerName ?? "Неизвестно";

  const handleSave = async () => {
    const brand = (editingCar?.brand ?? editingCar?.make ?? "").trim();
    const licensePlate = (editingCar?.licensePlate ?? "").trim();
    const ownerId = editingCar?.ownerId;

    if (brand && licensePlate && ownerId) {
      const owner = clients.find((c) => String(c.id) === String(ownerId));

      const newCar: CarItem = {
        id: editingCar?.id || Math.random().toString(36).substring(2, 9),
        ownerId,
        brand,
        make: brand,
        model: editingCar?.model || "",
        year: editingCar?.year || dayjs().year(),
        color: editingCar?.color || "",
        licensePlate,
        client: owner ?? null,
        ownerName: owner?.fullName || "Неизвестно",
      };

      await api.saveCar(newCar as any);
      setCars((await api.getCars()) as CarItem[]);
      close();
    }
  };

  const getCarFaults = (carId: string | number) => {
    const carRepairs = repairs.filter((r) => String(r.carId) === String(carId));
    return carRepairs.flatMap((r) =>
      r.faults.map((f) => ({
        description: f.description,
        date: r.dateReceived,
        isResolved: r.isArchived,
      }))
    );
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
            <Table.Th>Неисправности</Table.Th>
            <Table.Th w={100}>Действия</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {cars.map((car) => {
            const faults = getCarFaults(car.id);
            const ownerName = getCarOwnerName(car);
            const brand = getCarBrand(car);

            return (
              <Table.Tr key={String(car.id)}>
                <Table.Td>
                  <Badge
                    size="lg"
                    variant="outline"
                    color="dark"
                    radius="sm"
                    styles={{ root: { border: "2px solid" } }}
                  >
                    {car.licensePlate || "-"}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  {brand} {car.model || ""}
                </Table.Td>

                <Table.Td>{car.color || "-"}</Table.Td>

                <Table.Td>{car.year || "-"}</Table.Td>

                <Table.Td>
                  <Text
                    c="blue"
                    fw={500}
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => {
                      const client =
                        clients.find((c) => String(c.id) === String(car.ownerId)) ??
                        car.client ??
                        null;

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
                  {faults.length > 0 ? (
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
                      История ({faults.length})
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

      <Modal opened={opened} onClose={close} title="Карточка автомобиля">
        <Stack>
          <Select
            label="Владелец"
            placeholder="Выберите из базы"
            required
            data={clients.map((c) => ({
              value: String(c.id),
              label: c.fullName,
            }))}
            value={editingCar?.ownerId ? String(editingCar.ownerId) : null}
            onChange={(val) => setEditingCar({ ...editingCar, ownerId: val || "" })}
          />

          <Group grow>
            <TextInput
              label="Марка"
              placeholder="Toyota"
              required
              value={editingCar?.brand ?? editingCar?.make ?? ""}
              onChange={(e) =>
                setEditingCar({ ...editingCar, brand: e.target.value, make: e.target.value })
              }
            />
            <TextInput
              label="Модель"
              placeholder="Camry"
              value={editingCar?.model || ""}
              onChange={(e) => setEditingCar({ ...editingCar, model: e.target.value })}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Госномер"
              placeholder="A001AA77"
              required
              value={editingCar?.licensePlate || ""}
              onChange={(e) => setEditingCar({ ...editingCar, licensePlate: e.target.value })}
            />
            <TextInput
              label="Цвет"
              placeholder="Белый"
              value={editingCar?.color || ""}
              onChange={(e) => setEditingCar({ ...editingCar, color: e.target.value })}
            />
          </Group>

          <NumberInput
            label="Год выпуска"
            value={editingCar?.year || 2023}
            onChange={(val) =>
              setEditingCar({
                ...editingCar,
                year: typeof val === "number" ? val : Number(val || dayjs().year()),
              })
            }
          />

          <Button onClick={handleSave} mt="md">
            Сохранить
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={clientOpened}
        onClose={closeClient}
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
                  {dayjs(selectedClient.birthDate).format("DD.MM.YYYY")} г.р.
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

            <Stack gap="xs">
              <Text fw={700} size="sm" c="green">
                История обращений
              </Text>

              <Table variant="vertical" withTableBorder layout="fixed">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={120}>Дата</Table.Th>
                    <Table.Th>Автомобиль</Table.Th>
                    <Table.Th>Статус</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {repairs
                    .filter((r) => String(r.clientId) === String(selectedClient.id))
                    .sort((a, b) => dayjs(b.dateReceived).unix() - dayjs(a.dateReceived).unix())
                    .map((r) => {
                      const car = cars.find((c) => String(c.id) === String(r.carId));
                      return (
                        <Table.Tr key={r.id}>
                          <Table.Td>{dayjs(r.dateReceived).format("DD.MM.YYYY")}</Table.Td>
                          <Table.Td>
                            <Text size="xs" fw={500}>
                              {car ? `${getCarBrand(car)} ${car.model || ""}` : "-"}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {car?.licensePlate || "-"}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge size="xs" color={r.isArchived ? "green" : "blue"}>
                              {r.isArchived ? "Завершен" : "В работе"}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}

                  {repairs.filter((r) => String(r.clientId) === String(selectedClient.id)).length ===
                    0 && (
                    <Table.Tr>
                      <Table.Td colSpan={3}>
                        <Text ta="center" size="xs" c="dimmed" py="xs">
                          Нет истории обращений
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Stack>

            <Button fullWidth onClick={closeClient} mt="sm">
              Закрыть
            </Button>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={historyOpened}
        onClose={closeHistory}
        title={`История ремонтов: ${selectedCarForHistory ? `${getCarBrand(selectedCarForHistory)} ${selectedCarForHistory.model || ""} (${selectedCarForHistory.licensePlate || "-"})` : ""}`}
        size="xl"
      >
        <Stack gap="md" py="xs">
          {selectedCarForHistory &&
            (repairs.filter((r) => String(r.carId) === String(selectedCarForHistory.id)).length >
            0 ? (
              repairs
                .filter((r) => String(r.carId) === String(selectedCarForHistory.id))
                .sort((a, b) => dayjs(b.dateReceived).unix() - dayjs(a.dateReceived).unix())
                .map((repair) => (
                  <Card key={repair.id} withBorder p="md" radius="sm" shadow="xs">
                    <Group justify="space-between" mb="xs">
                      <Group gap="xs">
                        <Badge
                          size="sm"
                          color={repair.isArchived ? "green" : "blue"}
                          variant={repair.isArchived ? "light" : "filled"}
                        >
                          {repair.isArchived ? "Архив" : "В работе"}
                        </Badge>
                        <Text fw={700} size="sm" c="blue">
                          №{repair.id.split("-").pop()}
                        </Text>
                        <Text fw={500} size="sm">
                          {dayjs(repair.dateReceived).format("DD.MM.YYYY")}
                        </Text>
                      </Group>

                      <Group gap="xs">
                        {repair.dateFinished && (
                          <Text size="xs" c="dimmed">
                            Завершен: {dayjs(repair.dateFinished).format("DD.MM.YYYY")}
                          </Text>
                        )}
                      </Group>
                    </Group>

                    <List size="sm" spacing="xs" icon={<IconTool size={14} color="gray" />} mt="sm">
                      {repair.faults.map((f) => (
                        <List.Item key={f.id}>
                          <Group justify="space-between" wrap="nowrap" gap="xl">
                            <Text size="sm" fw={500}>
                              {f.description}
                            </Text>
                            <Badge
                              variant="dot"
                              size="xs"
                              color={f.status === "resolved" ? "green" : "orange"}
                            >
                              {FAULT_STATUS_LABELS[f.status]}
                            </Badge>
                          </Group>
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