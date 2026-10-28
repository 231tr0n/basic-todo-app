package com.example.todo.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.todo.configurations.TodoConfigurationProperties;
import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Objects;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

class AiControllerTest {
  private final AtomicReference<ReceivedRequest> received = new AtomicReference<>();
  private HttpServer server;

  @AfterEach
  void stopServer() {
    if (server != null) {
      server.stop(0);
    }
  }

  @Test
  void proxiesRequestsWithBodyHeadersAndQuery() throws Exception {
    byte[] responseBody = "{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
    String baseUrl = startServer(201, MediaType.APPLICATION_JSON_VALUE, responseBody);
    AiController controller = new AiController(configuration(baseUrl));
    byte[] body = "{\"model\":\"test\"}".getBytes(StandardCharsets.UTF_8);
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/ai/chat/completions");
    request.setQueryString("stream=false");
    request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer token");
    request.addHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
    request.setContentType(MediaType.APPLICATION_JSON_VALUE);
    request.setContent(body);

    ResponseEntity<StreamingResponseBody> response = controller.proxy(request, body);

    assertThat(response.getStatusCode().value()).isEqualTo(201);
    assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
    assertThat(copiedBody(response)).isEqualTo(responseBody);
    ReceivedRequest captured = received.get();
    assertThat(captured.method()).isEqualTo("POST");
    assertThat(captured.path()).isEqualTo("/v1/chat/completions");
    assertThat(captured.query()).isEqualTo("stream=false");
    assertThat(captured.authorization()).isEqualTo("Bearer token");
    assertThat(captured.contentType()).isEqualTo(MediaType.APPLICATION_JSON_VALUE);
    assertThat(captured.accept()).isEqualTo(MediaType.APPLICATION_JSON_VALUE);
    assertThat(captured.body()).isEqualTo("{\"model\":\"test\"}");
  }

  @Test
  void proxiesBodylessRequestsFromAServletContext() throws Exception {
    byte[] responseBody = "[]".getBytes(StandardCharsets.UTF_8);
    String baseUrl = startServer(200, null, responseBody);
    AiController controller = new AiController(configuration(baseUrl));
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/app/api/ai/models");
    request.setContextPath("/app");

    ResponseEntity<StreamingResponseBody> response = controller.proxy(request, null);

    assertThat(response.getStatusCode().value()).isEqualTo(200);
    assertThat(response.getHeaders().getContentType()).isNull();
    assertThat(copiedBody(response)).isEqualTo(responseBody);
    ReceivedRequest captured = received.get();
    assertThat(captured.method()).isEqualTo("GET");
    assertThat(captured.path()).isEqualTo("/v1/models");
    assertThat(captured.query()).isNull();
    assertThat(captured.authorization()).isNull();
    assertThat(captured.contentType()).isNull();
    assertThat(captured.accept()).isNull();
    assertThat(captured.body()).isEmpty();
  }

  @Test
  void streamsChunkedResponsesWithoutBuffering() throws Exception {
    CountDownLatch firstChunkSent = new CountDownLatch(1);
    CountDownLatch gate = new CountDownLatch(1);
    server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
    server.createContext(
        "/",
        exchange -> {
          exchange.getResponseHeaders().set(HttpHeaders.CONTENT_TYPE, "text/event-stream");
          exchange.sendResponseHeaders(200, 0);
          OutputStream output = exchange.getResponseBody();
          output.write("data: first\n\n".getBytes(StandardCharsets.UTF_8));
          output.flush();
          firstChunkSent.countDown();
          try {
            gate.await(5, TimeUnit.SECONDS);
          } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
          }
          output.write("data: second\n\n".getBytes(StandardCharsets.UTF_8));
          output.flush();
          exchange.close();
        });
    server.start();
    AiController controller =
        new AiController(configuration("http://localhost:" + server.getAddress().getPort()));

    ResponseEntity<StreamingResponseBody> response =
        controller.proxy(new MockHttpServletRequest("POST", "/api/ai/chat/completions"), null);
    assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.TEXT_EVENT_STREAM);

    ByteArrayOutputStream captured = new ByteArrayOutputStream();
    StreamingResponseBody streamingBody = Objects.requireNonNull(response.getBody());
    Thread reader =
        new Thread(
            () -> {
              try {
                streamingBody.writeTo(captured);
              } catch (IOException _) {
                // The copy ends with the response body.
              }
            });
    reader.start();
    assertThat(firstChunkSent.await(5, TimeUnit.SECONDS)).isTrue();

    // The first chunk must already be readable while the server is still waiting on the gate,
    // which proves the proxy never buffers the whole body before answering.
    long deadline = System.currentTimeMillis() + 2000;
    String capturedSoFar = captured.toString(StandardCharsets.UTF_8);
    while (System.currentTimeMillis() < deadline && !capturedSoFar.contains("first")) {
      Thread.sleep(10);
      capturedSoFar = captured.toString(StandardCharsets.UTF_8);
    }
    assertThat(capturedSoFar).contains("first").doesNotContain("second");

    gate.countDown();
    reader.join(5000);
    assertThat(captured.toString(StandardCharsets.UTF_8)).contains("second");
  }

  @Test
  void closesItsHttpClientWhenShuttingDown() {
    AiController controller = new AiController(configuration("http://localhost:1"));
    controller.closeHttpClient();
  }

  private static byte[] copiedBody(ResponseEntity<StreamingResponseBody> response)
      throws IOException {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    Objects.requireNonNull(response.getBody()).writeTo(output);
    return output.toByteArray();
  }

  private String startServer(int status, String contentType, byte[] responseBody)
      throws IOException {
    server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
    server.createContext(
        "/",
        exchange -> {
          received.set(
              new ReceivedRequest(
                  exchange.getRequestMethod(),
                  exchange.getRequestURI().getPath(),
                  exchange.getRequestURI().getRawQuery(),
                  exchange.getRequestHeaders().getFirst(HttpHeaders.AUTHORIZATION),
                  exchange.getRequestHeaders().getFirst(HttpHeaders.CONTENT_TYPE),
                  exchange.getRequestHeaders().getFirst(HttpHeaders.ACCEPT),
                  new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8)));
          if (contentType != null) {
            exchange.getResponseHeaders().set(HttpHeaders.CONTENT_TYPE, contentType);
          }
          exchange.sendResponseHeaders(status, responseBody.length);
          try (OutputStream output = exchange.getResponseBody()) {
            output.write(responseBody);
          }
        });
    server.start();
    return "http://localhost:" + server.getAddress().getPort();
  }

  private static TodoConfigurationProperties configuration(String baseUrl) {
    TodoConfigurationProperties properties = new TodoConfigurationProperties();
    properties.getAi().setBaseUrl(baseUrl);
    return properties;
  }

  private record ReceivedRequest(
      String method,
      String path,
      String query,
      String authorization,
      String contentType,
      String accept,
      String body) {}
}
