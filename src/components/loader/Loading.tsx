import { CircularProgress, Container } from "@mui/material";

export const Loading = () => {
  return (
    <Container maxWidth={"md"}>
      <CircularProgress size="3rem" aria-label="Loading…" />
    </Container>
  );
};
