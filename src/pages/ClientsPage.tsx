import React, { useEffect, useState } from "react";
import {
  Title,
  Button,
  Group,
  Modal,
  TextInput,
  Stack,
  Text,
  ActionIcon,
  Card,
  SimpleGrid,
  List,
  Badge,
  Divider,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import {
  IconUserPlus,
  IconEdit,
  IconExternalLink,
  IconTimeline,
  IconTrash,
} from "@tabler/icons-react";
import { api } from "../services/api.ts";
import { Client, Repair, Car } from "../types.ts";
import dayjs from "dayjs";

type ClientErrors = {
  fullName?: string;
  phoneNumber?: string;
  birthDate?: string;
  passportData?: string;
  registrationAddress?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [cars, setCars] = useState<Car[]>([]);

  const [opened, { open, close }] = useDisclosure(false);
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);

  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(null);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [errors, setErrors] = useState<ClientErrors>({});

  const loadData = async () => {
    const [clientsData, repairsData, carsData] = await Promise.all([
      api.getClients(),
      api.getRepairs(),
      api.getCars(),
    ]);

    setClients(clientsData);
    setRepairs(repairsData);
    setCars(carsData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const validateClient = () => {
    const nextErrors: ClientErrors = {};

    if (!editingClient?.fullName?.trim()) nextErrors.fullName = "Введите ФИО";
    if (!editingClient?.phoneNumber?.trim()) nextErrors.phoneNumber = "Введите телефон";
    if (!editingClient?.birthDate) nextErrors.birthDate = "Выберите дату рождения";
    if (!editingClient?.passportData?.trim()) nextErrors.passportData = "Введите паспортные данные";
    if (!editingClient?.registrationAddress?.trim())
      nextErrors.registrationAddress = "Введите адрес регистрации";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleOpenNew = () => {
    setEditingClient({
      fullName: "",
      phoneNumber: "",
      birthDate: "",
      passportData: "",
      registrationAddress: "",
    });
    setErrors({});
    open();
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient({
      ...client,
      birthDate: client.birthDate ? dayjs(client.birthDate).format("YYYY-MM-DD") : "",
    });
    setErrors({});
    open();
  };

  const handleSave = async () => {
    if (!validateClient()) return;

    const payload = {
      fullName: editingClient!.fullName!.trim(),
      phoneNumber: editingClient!.phoneNumber!.trim(),
      birthDate: editingClient!.birthDate!,
      passportData: editingClient!.passportData!.trim(),
      registrationAddress: editingClient!.registrationAddress!.trim(),
    };

    if (editingClient?.id) {
      await api.updateClient({
        id: editingClient.id,
        ...payload,
      });
    } else {
      await api.createClient(payload);
    }

    await loadData();
    close();
    setEditingClient(null);
  };

  const handleDelete = async (client: Client) => {
    const ok = window.confirm(`Удалить клиента "${client.fullName}"?`);
    if (!ok) return;

    await api.deleteClient(client.id);
    await loadData();

    if (selectedClientForHistory?.id === client.id) {
      closeHistory();
      setSelectedClientForHistory(null);
    }
  };

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>База клиентов</Title>
        <Button leftSection={<IconUserPlus size={18} />} onClick={handleOpenNew}>
          Добавить клиента
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {clients.map((client) => (
          <Card key={client.id} withBorder shadow="sm" radius="md">
            <Group justify="space-between" mb="xs" align="flex-start">
              <Text fw={700}>{client.fullName}</Text>

              <Group gap={4}>
                <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEdit(client)}>
                  <IconEdit size={16} />
                </ActionIcon>

                <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(client)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>

            <Stack gap={4}>
              <Text size="sm">
                <Text span fw={500}>
                  Дата рождения:
                </Text>{" "}
                {client.birthDate ? dayjs(client.birthDate).format("DD.MM.YYYY") : "-"}
              </Text>

              <Text size="sm">
                <Text span fw={500}>
                  Телефон:
                </Text>{" "}
                {client.phoneNumber || "-"}
              </Text>

              <Text size="sm">
                <Text span fw={500}>
                  Паспорт:
                </Text>{" "}
                {client.passportData || "-"}
              </Text>

              <Text size="sm" lineClamp={1}>
                <Text span fw={500}>
                  Прописка:
                </Text>{" "}
                {client.registrationAddress || "-"}
              </Text>

              <Text size="sm" mt="xs" fw={700} c="blue">
                Обращений в базе:{" "}
                {repairs.filter((r) => String(r.clientId) === String(client.id)).length}
              </Text>
            </Stack>

            <Button
              variant="light"
              color="blue"
              fullWidth
              mt="md"
              rightSection={<IconExternalLink size={14} />}
              onClick={() => {
                setSelectedClientForHistory(client);
                openHistory();
              }}
            >
              История обращений
            </Button>
          </Card>
        ))}
      </SimpleGrid>

      <Modal
        opened={opened}
        onClose={() => {
          close();
          setErrors({});
          setEditingClient(null);
        }}
        title={editingClient?.id ? "Редактировать клиента" : "Новый клиент"}
        size="lg"
      >
        <Stack>
          <TextInput
            label="ФИО"
            placeholder="Иванов Иван Иванович"
            required
            value={editingClient?.fullName || ""}
            error={errors.fullName}
            onChange={(e) => {
              setEditingClient({ ...editingClient, fullName: e.target.value });
              setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
          />

          <TextInput
            label="Телефон"
            placeholder="+7 (900) 000-00-00"
            required
            value={editingClient?.phoneNumber || ""}
            error={errors.phoneNumber}
            onChange={(e) => {
              setEditingClient({ ...editingClient, phoneNumber: e.target.value });
              setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
            }}
          />

          <DateInput
            label="Дата рождения"
            placeholder="Выберите дату"
            required
            value={editingClient?.birthDate ? new Date(editingClient.birthDate) : null}
            error={errors.birthDate}
            onChange={(date) => {
              setEditingClient({
                ...editingClient,
                birthDate: date ? dayjs(date).format("YYYY-MM-DD") : "",
              });
              setErrors((prev) => ({ ...prev, birthDate: undefined }));
            }}
          />

          <TextInput
            label="Паспортные данные"
            placeholder="Серия, номер, кем и когда выдан"
            required
            value={editingClient?.passportData || ""}
            error={errors.passportData}
            onChange={(e) => {
              setEditingClient({ ...editingClient, passportData: e.target.value });
              setErrors((prev) => ({ ...prev, passportData: undefined }));
            }}
          />

          <TextInput
            label="Адрес регистрации (прописка)"
            placeholder="г. Москва, ул. Ленина..."
            required
            value={editingClient?.registrationAddress || ""}
            error={errors.registrationAddress}
            onChange={(e) => {
              setEditingClient({ ...editingClient, registrationAddress: e.target.value });
              setErrors((prev) => ({ ...prev, registrationAddress: undefined }));
            }}
          />

          <Button onClick={handleSave} mt="md">
            Сохранить
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={historyOpened}
        onClose={() => {
          closeHistory();
          setSelectedClientForHistory(null);
        }}
        title={`История обращений: ${selectedClientForHistory?.fullName || ""}`}
        size="xl"
      >
        <Stack>
          {selectedClientForHistory &&
            (repairs.filter((r) => String(r.clientId) === String(selectedClientForHistory.id)).length >
            0 ? (
              repairs
                .filter((r) => String(r.clientId) === String(selectedClientForHistory.id))
                .sort((a, b) => dayjs(b.dateReceived).unix() - dayjs(a.dateReceived).unix())
                .map((repair) => {
                  const car = cars.find((c) => String(c.id) === String(repair.carId));

                  return (
                    <Card key={repair.id} withBorder mb="sm">
                      <Group justify="space-between" mb="xs">
                        <Group>
                          <IconTimeline size={20} color="gray" />
                          <Text fw={700}>{dayjs(repair.dateReceived).format("DD.MM.YYYY")}</Text>
                          <Badge color={repair.isArchived ? "green" : "blue"}>
                            {repair.isArchived ? "Завершен" : "В работе"}
                          </Badge>
                        </Group>

                        <Text size="sm" fw={500}>
                          {car?.brand || "-"} {car?.model || ""} ({car?.licensePlate || "-"})
                        </Text>
                      </Group>

                      <Divider mb="xs" />

                      <Text size="xs" fw={700} mb={5} tt="uppercase" c="dimmed">
                        Выполненные/запланированные работы:
                      </Text>

                      <List size="sm" spacing="xs">
                        {repair.faults.map((f) => (
                          <List.Item key={f.id}>
                            <Group justify="space-between">
                              <Text size="sm">{f.description}</Text>
                              <Text size="xs" c="dimmed">
                                {f.costLabor + f.costParts} ₽
                              </Text>
                            </Group>
                          </List.Item>
                        ))}
                      </List>
                    </Card>
                  );
                })
            ) : (
              <Text ta="center" py="xl" c="dimmed">
                История обращений пуста
              </Text>
            ))}
        </Stack>
      </Modal>
    </Stack>
  );
}