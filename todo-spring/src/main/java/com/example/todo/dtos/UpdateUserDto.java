package com.example.todo.dtos;

import com.example.todo.enums.RoleEnum;
import java.util.Set;
import lombok.Data;

@Data
public class UpdateUserDto {
  private String username;
  private Set<RoleEnum> roles;
}
