package com.example.todo.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class SignUpDto {
  @NotNull
  @Size(min = 1, max = 255)
  private String username;

  @NotNull
  @Size(min = 1, max = 255)
  private String password;

  @NotNull
  @Size(min = 1, max = 10)
  private List<String> authorities;
}
