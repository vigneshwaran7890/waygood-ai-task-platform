class UnsupportedOperationError(Exception):
    pass


def op_uppercase(text: str) -> str:
    return text.upper()


def op_lowercase(text: str) -> str:
    return text.lower()


def op_reverse_string(text: str) -> str:
    return text[::-1]


def op_word_count(text: str) -> str:
    return str(len(text.split()))


OPERATIONS = {
    "UPPERCASE": op_uppercase,
    "LOWERCASE": op_lowercase,
    "REVERSE_STRING": op_reverse_string,
    "WORD_COUNT": op_word_count,
}


def run_operation(operation_type: str, input_text: str) -> str:
    handler = OPERATIONS.get(operation_type)
    if handler is None:
        raise UnsupportedOperationError(f"Unsupported operation type: {operation_type}")
    return handler(input_text)
