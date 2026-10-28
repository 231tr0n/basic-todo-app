package com.example.todo.controllers;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.todo.entities.UserEntity;
import com.example.todo.repositories.TodoRepository;
import com.example.todo.repositories.UserRepository;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GlobalControllerIntegrationTest {
  private static final String ADMIN = "ADMIN";
  private static final String PASSWORD = "Secret123!";

  @Autowired private MockMvc mockMvc;
  @Autowired private ObjectMapper objectMapper;
  @Autowired private UserRepository userRepository;
  @Autowired private TodoRepository todoRepository;

  @BeforeEach
  void cleanDatabase() {
    todoRepository.deleteAll();
    userRepository.deleteAll();
  }

  @Test
  void signsUpSignsInAndSignsOut() throws Exception {
    signUp("admin", List.of(ADMIN), 201);
    signUp("alice", List.of(), 201);
    signUp("alice", List.of(), 409);

    String aliceCookie = signIn("alice", PASSWORD);

    mockMvc
        .perform(get("/api/users/0").cookie(token(aliceCookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("alice"))
        .andExpect(jsonPath("$.authorities", empty()));

    mockMvc
        .perform(post("/api/signout").cookie(token(aliceCookie)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/users/0").cookie(token(aliceCookie)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void rejectsAnonymousInvalidAndWrongCredentials() throws Exception {
    signUp("alice", List.of(), 201);

    mockMvc.perform(get("/api/users/0")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(get("/api/users/0").cookie(new Cookie("token", "invalid")))
        .andExpect(status().isUnauthorized())
        .andExpect(cookie().maxAge("token", 0));

    mockMvc
        .perform(
            post("/api/signin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("username", "alice", "password", "wrong"))))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void onlyTheFirstAccountCanSelfAssignAdmin() throws Exception {
    signUp("admin", List.of(ADMIN), 201);
    signUp("alice", List.of(ADMIN), 403);
    signUp("bob", List.of(), 201);

    mockMvc
        .perform(
            put("/api/users/{id}", userId("bob"))
                .cookie(token(signIn("bob", PASSWORD)))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("authorities", List.of(ADMIN)))))
        .andExpect(status().isForbidden());
  }

  @Test
  void adminManagesUsersWhileNonAdminsOnlySeeThemselves() throws Exception {
    signUp("admin", List.of(ADMIN), 201);
    signUp("alice", List.of(), 201);
    signUp("bob", List.of(), 201);

    String adminCookie = signIn("admin", PASSWORD);
    String aliceCookie = signIn("alice", PASSWORD);
    long aliceId = userId("alice");
    long bobId = userId("bob");

    mockMvc
        .perform(get("/api/users").cookie(token(adminCookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(3)));

    mockMvc
        .perform(get("/api/users").cookie(token(aliceCookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].username").value("alice"));

    mockMvc
        .perform(get("/api/users/{id}", bobId).cookie(token(aliceCookie)))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(get("/api/users/{id}", bobId).cookie(token(adminCookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("bob"));

    mockMvc
        .perform(
            put("/api/users/{id}", aliceId)
                .cookie(token(adminCookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("username", "alice-renamed", "authorities", List.of(ADMIN)))))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/users/{id}", aliceId).cookie(token(adminCookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("alice-renamed"))
        .andExpect(jsonPath("$.authorities", containsInAnyOrder(ADMIN)));

    mockMvc
        .perform(delete("/api/users/{id}", bobId).cookie(token(adminCookie)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/users/{id}", bobId).cookie(token(adminCookie)))
        .andExpect(status().isNotFound());
  }

  @Test
  void renamingTheCurrentUserRefreshesTheSessionCookie() throws Exception {
    signUp("alice", List.of(), 201);
    String cookie = signIn("alice", PASSWORD);

    MvcResult result =
        mockMvc
            .perform(
                put("/api/users/0")
                    .cookie(token(cookie))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json(Map.of("username", "alice-renamed"))))
            .andExpect(status().isNoContent())
            .andReturn();

    String refreshed = result.getResponse().getCookie("token").getValue();
    mockMvc
        .perform(get("/api/users/0").cookie(token(refreshed)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("alice-renamed"));
  }

  @Test
  void changesPasswordAndRejectsInvalidPasswordChanges() throws Exception {
    signUp("alice", List.of(), 201);
    String cookie = signIn("alice", PASSWORD);

    mockMvc
        .perform(
            patch("/api/users/0")
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("oldPassword", "wrong", "newPassword", "Next123!"))))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(
            patch("/api/users/0")
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("oldPassword", PASSWORD, "newPassword", "Next123!"))))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            patch("/api/users/0")
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("oldPassword", "Next123!", "newPassword", "Next123!"))))
        .andExpect(status().isBadRequest());

    signIn("alice", "Next123!");
  }

  @Test
  void managesTodosAndClearsThem() throws Exception {
    signUp("alice", List.of(), 201);
    String cookie = signIn("alice", PASSWORD);

    MvcResult created =
        mockMvc
            .perform(
                post("/api/users/0/todos")
                    .cookie(token(cookie))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json(Map.of("title", "First", "description", "Description"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("NOT_STARTED"))
            .andReturn();
    long todoId =
        objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

    mockMvc
        .perform(get("/api/users/0/todos/{todoId}", todoId).cookie(token(cookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("First"));

    mockMvc
        .perform(
            put("/api/users/0/todos/{todoId}", todoId)
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("title", "Updated"))))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(
            patch("/api/users/0/todos/{todoId}", todoId)
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("status", "IN_PROGRESS"))))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/users/0/todos").cookie(token(cookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].title").value("Updated"))
        .andExpect(jsonPath("$[0].status").value("IN_PROGRESS"));

    mockMvc
        .perform(
            post("/api/users/0/todos")
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("title", "Second", "description", "Description"))))
        .andExpect(status().isCreated());

    mockMvc
        .perform(delete("/api/users/0/todos/{todoId}", todoId).cookie(token(cookie)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/users/0/todos/{todoId}", todoId).cookie(token(cookie)))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(delete("/api/users/0/todos").cookie(token(cookie)))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/users/0/todos").cookie(token(cookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", empty()));
  }

  @Test
  void isolatesTodosBetweenUsers() throws Exception {
    signUp("admin", List.of(ADMIN), 201);
    signUp("alice", List.of(), 201);
    signUp("bob", List.of(), 201);

    String adminCookie = signIn("admin", PASSWORD);
    String aliceCookie = signIn("alice", PASSWORD);
    long bobId = userId("bob");

    MvcResult created =
        mockMvc
            .perform(
                post("/api/users/{id}/todos", bobId)
                    .cookie(token(adminCookie))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json(Map.of("title", "Bob todo", "description", "Private"))))
            .andExpect(status().isCreated())
            .andReturn();
    long todoId =
        objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

    mockMvc
        .perform(get("/api/users/{id}/todos", bobId).cookie(token(aliceCookie)))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(get("/api/users/{id}/todos/{todoId}", bobId, todoId).cookie(token(aliceCookie)))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(get("/api/users/{id}/todos/{todoId}", bobId, todoId).cookie(token(adminCookie)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.title").value("Bob todo"));
  }

  @Test
  void returnsBadRequestForInvalidPayloads() throws Exception {
    signUp("alice", List.of(), 201);
    String cookie = signIn("alice", PASSWORD);

    mockMvc
        .perform(
            post("/api/users/0/todos")
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("title", "", "description", "Description"))))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(
            put("/api/users/0/todos/1")
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(
            patch("/api/users/0/todos/1")
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("status", "UNKNOWN"))))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(
            post("/api/users/0/todos")
                .cookie(token(cookie))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{not json"))
        .andExpect(status().isBadRequest());

    mockMvc
        .perform(delete("/api/users/0/todos/999999").cookie(token(cookie)))
        .andExpect(status().isNotFound());

    mockMvc.perform(get("/api/unknown")).andExpect(status().isNotFound());
  }

  private void signUp(String username, List<String> authorities, int expectedStatus)
      throws Exception {
    mockMvc
        .perform(
            post("/api/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json(
                        Map.of(
                            "username",
                            username,
                            "password",
                            PASSWORD,
                            "authorities",
                            authorities))))
        .andExpect(status().is(expectedStatus));
  }

  private String signIn(String username, String password) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/signin")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json(Map.of("username", username, "password", password))))
            .andExpect(status().isOk())
            .andReturn();
    return result.getResponse().getCookie("token").getValue();
  }

  private long userId(String username) {
    return userRepository.findByUsername(username).map(UserEntity::getId).orElseThrow();
  }

  private Cookie token(String value) {
    return new Cookie("token", value);
  }

  private String json(Object value) throws Exception {
    return objectMapper.writeValueAsString(value);
  }
}
