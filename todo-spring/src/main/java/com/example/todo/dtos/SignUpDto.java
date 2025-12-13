package com.example.todo.dtos;

import com.example.todo.enums.RoleEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Set;
import lombok.Data;

@Data
public class SignUpDto {
  @NotNull private String username;
  @NotNull private String password;
  @NotBlank private Set<RoleEnum> roles;
}
