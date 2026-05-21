import { Stack, Title, Text, Tabs, Accordion, Paper, List, Anchor, Box, AspectRatio } from '@mantine/core';
import { HelpCircle, Mail, PlayCircle } from 'lucide-react';

const FAQ_ITEMS = [
  {
    value: 'add-patient',
    question: 'How do I add a new patient?',
    answer: (
      <>
        <Text size="sm" mb="xs">To add a new maternal record:</Text>
        <List size="sm" spacing="xs">
          <List.Item>Go to <strong>Dashboard</strong> or <strong>Records</strong> and click the <strong>Add record</strong> button (or the plus icon in the header).</List.Item>
          <List.Item>Fill in the <strong>General Data</strong> tab: last name, first name, age, barangay, address, LMP (last menstrual period), gravida, parity, and other required fields.</List.Item>
          <List.Item>Use the <strong>Next</strong> button or click the other tabs to complete <strong>Prenatal Checkup (8ANC)</strong>, <strong>Immunization</strong>, <strong>Supplementation</strong>, <strong>Laboratory Screenings</strong>, <strong>Labor &amp; Delivery</strong>, and <strong>Postnatal Care</strong> as applicable.</List.Item>
          <List.Item>Click <strong>Save</strong> at the bottom when done. Required fields (e.g. last name, first name, age, barangay, address, LMP, gravida, parity) must be filled or the form will show errors and scroll to the first error.</List.Item>
        </List>
      </>
    ),
  },
  {
    value: 'edit-patient',
    question: 'How do I edit an existing patient record?',
    answer: (
      <>
        <Text size="sm" mb="xs">To edit a record:</Text>
        <List size="sm" spacing="xs">
          <List.Item>Go to <strong>Records</strong> and find the patient in the table.</List.Item>
          <List.Item>Click the <strong>Edit</strong> (pencil) icon on that row. The same multi-tab form will open with the existing data.</List.Item>
          <List.Item>Update any tabs (General, Prenatal, Immunization, Supplementation, Labs, Delivery, Postnatal) and click <strong>Save</strong>.</List.Item>
        </List>
      </>
    ),
  },
  {
    value: 'records-filters',
    question: 'How do I filter or search records?',
    answer: (
      <>
        <Text size="sm" mb="xs">On the Records page you can:</Text>
        <List size="sm" spacing="xs">
          <List.Item><strong>Search</strong> by name using the search box.</List.Item>
          <List.Item><strong>Filter by month and year</strong> so only records with activity in that period are shown.</List.Item>
          <List.Item><strong>Filter by barangay</strong> using the barangay dropdown.</List.Item>
          <List.Item><strong>Filter by status</strong>: All, Normal risk, or High risk. You can also check "Due for visit only" to see patients due for a prenatal visit in the current month.</List.Item>
        </List>
      </>
    ),
  },
  {
    value: 'dashboard',
    question: 'What does the Dashboard show?',
    answer: (
      <>
        <Text size="sm" mb="xs">The Dashboard gives a quick overview:</Text>
        <List size="sm" spacing="xs">
          <List.Item><strong>Recent records</strong> — latest updated/created patients.</List.Item>
          <List.Item><strong>High-risk count</strong> — number of patients marked as high risk.</List.Item>
          <List.Item><strong>Due for visit</strong> — patients who are due for a prenatal visit this month. Click a card or "Due for visit" to go to Records with that filter applied.</List.Item>
          <List.Item>Clicking <strong>Add record</strong> or the plus icon opens the new-patient form.</List.Item>
        </List>
      </>
    ),
  },
  {
    value: 'patient-tabs',
    question: 'What are the tabs in the patient form?',
    answer: (
      <>
        <Text size="sm" mb="xs">The add/edit form has seven tabs:</Text>
        <List size="sm" spacing="xs">
          <List.Item><strong>General Data</strong> — name, age, address, barangay, LMP, EDC, gravida, parity, etc.</List.Item>
          <List.Item><strong>Prenatal Checkup (8ANC)</strong> — prenatal visits with date, AOG, trimester, weight, height, BMI, remarks. Add visits in date order; visit date must be after the last one and not beyond 43 weeks AOG.</List.Item>
          <List.Item><strong>Immunization Status</strong> — TD1–TD5 dates; mark if TD was completed previously.</List.Item>
          <List.Item><strong>Prenatal Supplementation</strong> — IFA, MMS, and Calcium logs (date and count). Add entries in chronological order.</List.Item>
          <List.Item><strong>Laboratory Screenings</strong> — lab logs (e.g. CBC) with date and result.</List.Item>
          <List.Item><strong>Labor, Delivery and Birth Outcomes</strong> — delivery outcome, mode, place, attendant, birth weight(s), sex, PNC dates, etc.</List.Item>
          <List.Item><strong>Postnatal Care and Postpartum Supplementation</strong> — postpartum IFA logs and related dates. Dates must be in order.</List.Item>
        </List>
      </>
    ),
  },
  {
    value: 'reports',
    question: 'How do I generate reports?',
    answer: (
      <>
        <Text size="sm" mb="xs">Go to <strong>Reports</strong>:</Text>
        <List size="sm" spacing="xs">
          <List.Item><strong>FHSIS M1</strong> — select month, year, and optionally barangay, then click the export button to download the report (e.g. Excel).</List.Item>
          <List.Item><strong>Maternal TCL</strong> — same idea: choose month, year, and optional barangay, then export. Reports use the same record data as Records but filtered by your selections.</List.Item>
        </List>
      </>
    ),
  },
  {
    value: 'dates-order',
    question: 'Why do I get "Invalid date" or order errors?',
    answer: (
      <>
        <Text size="sm" mb="xs">Many fields require dates to be in chronological order:</Text>
        <List size="sm" spacing="xs">
          <List.Item><strong>Prenatal visits</strong> — each visit date must be after the previous one and not beyond 43 weeks AOG.</List.Item>
          <List.Item><strong>TD immunization (TD1–TD5)</strong> — each date must be after the previous.</List.Item>
          <List.Item><strong>Supplementation logs (IFA, MMS, Calcium)</strong> — each new log date must be after the latest existing one for that type.</List.Item>
          <List.Item><strong>Postpartum logs and PNC contacts</strong> — dates must follow in order. Fix by entering dates from earliest to latest or editing the existing entry that is out of order.</List.Item>
        </List>
      </>
    ),
  },
];

export default function HelpView() {
  return (
    <Stack>
      <Title order={3}>Help Center</Title>
      <Text c="dimmed" size="sm">Find answers to common questions and how to get in touch.</Text>

      <Tabs defaultValue="faqs" color="teal" variant="pills" radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="faqs" leftSection={<HelpCircle size={16} />}>FAQs</Tabs.Tab>
          <Tabs.Tab value="walkthrough" leftSection={<PlayCircle size={16} />}>Video Walkthrough</Tabs.Tab>
          <Tabs.Tab value="contact" leftSection={<Mail size={16} />}>Contact Us</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="faqs">
          <Paper p="md" radius="md" withBorder>
            <Accordion variant="separated" radius="md">
              {FAQ_ITEMS.map((item) => (
                <Accordion.Item key={item.value} value={item.value}>
                  <Accordion.Control>{item.question}</Accordion.Control>
                  <Accordion.Panel>{item.answer}</Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="walkthrough">
          <Paper p="xl" radius="md" withBorder>
            <Title order={4} mb="xs">Website Walkthrough</Title>
            <Text size="sm" c="dimmed" mb="md">
              Watch this video to learn how to navigate and use the KONEK application.
            </Text>
            <AspectRatio ratio={16 / 9} maw={800}>
              <iframe
                src="https://www.youtube.com/embed/Eb15GSiS7sQ"
                title="KONEK Website Walkthrough"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: 'var(--mantine-radius-md)' }}
              />
            </AspectRatio>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="contact">
          <Paper p="xl" radius="md" withBorder>
            <Title order={4} mb="sm">Contact Us</Title>
            <Text size="sm" c="dimmed" mb="md">
              For any inquiries, feel free to reach out to our team:
            </Text>
            <Stack gap="sm">
              <Box>
                <Text size="sm" fw={700}>Alyssa Jane G. Panaligan</Text>
                <Text size="sm"><Anchor href="mailto:23-51350@g.batstate-u.edu.ph">23-51350@g.batstate-u.edu.ph</Anchor></Text>
                <Text size="sm">0966-366-6553</Text>
              </Box>
              <Box>
                <Text size="sm" fw={700}>Abygael Victoria L. Aquino</Text>
                <Text size="sm"><Anchor href="mailto:23-55758@g.batstate-u.edu.ph">23-55758@g.batstate-u.edu.ph</Anchor></Text>
                <Text size="sm">0906-011-9240</Text>
              </Box>
              <Box>
                <Text size="sm" fw={700}>Marian B. Bauan</Text>
                <Text size="sm"><Anchor href="mailto:23-59213@g.batstate-u.edu.ph">23-59213@g.batstate-u.edu.ph</Anchor></Text>
                <Text size="sm">0967-134-0680</Text>
              </Box>
              <Box>
                <Text size="sm" fw={700}>Jonna Mae O. Cabrera</Text>
                <Text size="sm"><Anchor href="mailto:23-51335@g.batstae-u.edu.ph">23-51335@g.batstae-u.edu.ph</Anchor></Text>
                <Text size="sm">0929-369-1500</Text>
              </Box>
              <Box>
                <Text size="sm" fw={700}>Ysabela Marie M. Palbacal</Text>
                <Text size="sm"><Anchor href="mailto:23-59368@g.batstate-u.edu.ph">23-59368@g.batstate-u.edu.ph</Anchor></Text>
                <Text size="sm">0917-803-4599</Text>
              </Box>
              <Box>
                <Text size="sm" fw={700}>Meliah Isabel P. Sebuc</Text>
                <Text size="sm"><Anchor href="mailto:23-50267@g.batstate-u.edu.ph">23-50267@g.batstate-u.edu.ph</Anchor></Text>
                <Text size="sm">0956-711-8678</Text>
              </Box>
            </Stack>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
